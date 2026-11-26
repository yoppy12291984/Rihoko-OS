const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('japan-quest.js','utf8');
const KEY='rihoko-japan-quest-v1';
const data={regions:['確認地方'],viewBox:'0 0 100 100',note:'検証用',source:'https://example.test/map',prefectures:[1,2,26,47].map(id=>({id,name:'県'+id,reading:'けん',region:0,paths:[]}))};
function memory(){const values={};return {getItem:key=>values[key]||null,setItem(key,value){values[key]=value;this.writes++;},writes:0};}
function host(){
  let markup='',nodes=[];
  function matches(node,selector){return selector.split(',').some(part=>{if(part[0]==='.')return (node.attrs.class||'').split(' ').includes(part.slice(1));const m=/^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(part);return m&&Object.hasOwn(node.attrs,m[1])&&(m[2]===undefined||node.attrs[m[1]]===m[2]);});}
  return {
    get innerHTML(){return markup;},set innerHTML(value){markup=value;nodes=Array.from(value.matchAll(/<(?:button|g|svg|p)\b([^>]*)>/g),m=>{const attrs=Object.fromEntries(Array.from(m[1].matchAll(/([\w:-]+)(?:="([^"]*)")?/g),a=>[a[1],a[2]||''])),dataset={};Object.entries(attrs).forEach(([key,val])=>{if(key.startsWith('data-'))dataset[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=val;});return {attrs,dataset,hasAttribute:key=>Object.hasOwn(attrs,key),setAttribute:(key,val)=>attrs[key]=val,querySelectorAll:()=>[],onclick:null,textContent:''};});},
    querySelector(selector){return nodes.find(n=>matches(n,selector))||null;},querySelectorAll(selector){return nodes.filter(n=>matches(n,selector));}
  };
}
function browser(storage){const root={localStorage:storage,JapanMapData:data},context={window:root,Intl,Date,Math};vm.runInNewContext(source,context);return root.JapanQuest;}
function click(target,selector){const button=target.querySelector(selector);assert(button&&typeof button.onclick==='function','clickable '+selector);button.onclick();}
const storage=memory(),api=browser(storage),legacy=host();
api.mount(legacy);
assert(legacy.innerHTML.includes('data-jq-open'),'old mount keeps the closed entry');
assert(!legacy.innerHTML.includes('class="jq-map"'));
const first=host();api.mount(first,{open:true});
assert(first.innerHTML.includes('class="jq-map"'),'dedicated tab opens the actual map');
assert.equal(storage.writes,0,'opening a map is read-only');
click(first,'[data-jq-start="name"]');
let saved=JSON.parse(storage.getItem(KEY));assert.equal(saved.session.index,0);assert.equal(saved.session.queue.length,3);
const wrong=saved.session.choices.find(id=>id!==saved.session.queue[0]);
click(first,'[data-jq-answer="'+wrong+'"]');
click(first,'[data-jq-hint]');
const beforeTab=storage.getItem(KEY),writes=storage.writes;
const second=host();api.mount(second,{open:true});
assert(second.innerHTML.includes('class="jq-question"'),'switching tabs preserves an active question');
assert(second.innerHTML.includes('手がかりを表示中'));
assert.equal(storage.getItem(KEY),beforeTab);assert.equal(storage.writes,writes,'remount never rewrites a session');
click(second,'[data-jq-answer="'+saved.session.queue[0]+'"]');
saved=JSON.parse(storage.getItem(KEY));assert.equal(saved.records.length,1);assert.equal(saved.records[0].self,false);assert.equal(saved.records[0].hint,true);assert.equal(saved.records[0].wrong,1);
click(second,'[data-jq-next]');saved=JSON.parse(storage.getItem(KEY));assert.equal(saved.session.index,1);
click(second,'[data-jq-pause]');assert(second.innerHTML.includes('data-jq-resume'));
const beforeReload=storage.getItem(KEY),reloaded=browser(storage),third=host();
reloaded.mount(third,{open:true});
assert(third.innerHTML.includes('class="jq-map"'));assert(third.innerHTML.includes('前のつづき（2 / 3問）'));
assert.equal(storage.getItem(KEY),beforeReload,'reload and open preserve the saved question and records');
click(third,'[data-jq-resume]');
assert(third.innerHTML.includes('class="jq-question"'));assert(third.innerHTML.includes('2 / 3 問'));
assert.deepEqual(JSON.parse(storage.getItem(KEY)),saved);
const fourth=host();reloaded.mount(fourth,{open:true});
assert(fourth.innerHTML.includes('2 / 3 問'));assert.equal(JSON.parse(storage.getItem(KEY)).records.length,1,'navigation awards no duplicate results');
console.log('PASS: direct map opening, legacy entry, read-only remount, active quiz/hint/mistake preservation, pause, reload and second-question resume without duplicate records.');
