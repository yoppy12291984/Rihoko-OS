const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Learning=require('./learning-content.js');
const KEY='rihoko-learning-content-v1';
function storage(seed){return {data:{[KEY]:JSON.stringify(seed)},fail:false,writes:0,getItem(k){return this.data[k]||null;},setItem(k,v){if(this.fail)throw Error('quota');this.writes++;this.data[k]=v;}};}
const seed={packs:[],responses:{'existing/1/science/q1':{answer:'前の答え',rating:'self'}},badges:Array.from({length:8},(_,i)=>({id:'badge-'+i,title:'調査'+i})),partner:'mina',learningEvidenceVersion:1};
let now=new Date('2026-11-26T06:00:00Z');
const saved=storage(seed),db=Learning.create(saved,[],()=>now),original=saved.data[KEY];
assert.equal(db.guide().partner.id,'kotone','undated old partner does not stop daily rotation');
assert.equal(db.guide().manual,false);assert.equal(saved.data[KEY],original);assert.equal(saved.writes,0);
const oldResponses=JSON.stringify(db.exportResults().responses),oldBadges=JSON.stringify(db.exportResults().badges);
db.choosePartner('haru');assert.equal(db.guide().partner.id,'haru');assert.equal(db.guide().manual,true);
assert.equal(db.exportResults().partnerDate,'2026-11-26');
assert.equal(db.exportResults().partner,'haru');
assert.equal(JSON.stringify(db.exportResults().responses),oldResponses);assert.equal(JSON.stringify(db.exportResults().badges),oldBadges);
assert.equal(Learning.create(saved,[],()=>now).guide().partner.id,'haru','reload preserves current day override');
const beforeFailure=saved.data[KEY];saved.fail=true;
assert.throws(()=>db.choosePartner('leo'),/quota/);assert.equal(saved.data[KEY],beforeFailure);assert.equal(db.guide().partner.id,'haru');
saved.fail=false;now=new Date('2026-11-26T14:59:59.999Z');assert.equal(db.guide().partner.id,'haru');
now=new Date('2026-11-26T15:00:00Z');assert.equal(db.guide().partner.id,'leo');assert.equal(db.guide().manual,false);
assert.equal(db.exportResults().partnerDate,'2026-11-26','export retains historical choice date instead of rewriting it');
assert.equal(saved.data[KEY],beforeFailure,'day change has no persistence side effects');
assert.equal(JSON.stringify(db.exportResults().responses),oldResponses);assert.equal(JSON.stringify(db.exportResults().badges),oldBadges);
const restricted=storage({packs:[],responses:{},partner:'mina',partnerDate:'2026-11-26'});
const restrictedDB=Learning.create(restricted,[],()=>new Date('2026-11-26T06:00:00Z'));
assert.equal(restrictedDB.guide().partner.id,'kotone','all five can be daily guests even with no badges');
assert.equal(restrictedDB.guide().manual,false,'a locked manual preference is ignored');
assert.throws(()=>restrictedDB.choosePartner('mina'),/準備中/);assert.equal(restricted.writes,0);

// Execute the browser branch with narrow DOM objects. Any whole-node render is forbidden.
let browserNow=new Date('2026-11-26T14:59:59Z');
class BrowserDate extends Date{constructor(...args){super(...(args.length?args:[browserNow]));}static now(){return +browserNow;}}
function node(attrs={},dataset={}){return {attrs:{...attrs},dataset:{...dataset},textContent:'',getAttribute(k){return this.attrs[k]||null;},setAttribute(k,v){this.attrs[k]=v;},set innerHTML(_){throw Error('Guide refresh must not replace the learning DOM');}};}
const images=[node({src:'detective-girl-v1.png'}),node({src:'detective-girl-v1.png'})],names=[node()],lines=[node()];
const buttons=[node({}, {partner:'rihoko'}),node({}, {partner:'kotone'}),node({}, {partner:'leo'})];
buttons[1].disabled=true;buttons[1].textContent='あと1こ';
const selectedAnswer={value:'選んだ答え',ariaPressed:'true',selectionStart:2,selectionEnd:4},question={step:2,answer:selectedAnswer};
const queried=[],listeners={},intervals=[];
const document={hidden:false,activeElement:selectedAnswer,querySelectorAll(selector){queried.push(selector);const result={'[data-daily-guide-image]':images,'[data-daily-guide-name]':names,'[data-daily-guide-line]':lines,'[data-partner]':buttons}[selector];assert(result,'Unexpected DOM access: '+selector);return result;},addEventListener(type,fn){listeners[type]=fn;}};
const browserStorage=storage({...seed,partner:undefined});
const context={Date:BrowserDate,Intl,document,window:null,localStorage:browserStorage,sessionStorage:{getItem:()=>null},setInterval(fn,ms){intervals.push({fn,ms});},WeeklyCurriculum:require('./weekly-curriculum.js'),AdaptiveLessons:require('./adaptive-lessons.js'),ContinuingLearning:require('./continuing-learning.js'),ProblemMetadata:require('./problem-metadata.js'),DetectiveGuide:require('./detective-guide.js')};
context.window=context;vm.runInNewContext(fs.readFileSync(require.resolve('./learning-content.js'),'utf8'),context);
context.LearningContent.refreshGuide();assert(images.every(img=>img.attrs.src==='detective-kotone-v2.png'));assert.equal(names[0].textContent,'今日の案内役：ことね');assert(lines[0].textContent.startsWith('ことね「'));
assert.equal(buttons[1].attrs['aria-pressed'],'true');assert.equal(buttons[1].textContent,'あと1こ','a guest can be current guide while its badge requirement remains visible');
browserNow=new Date('2026-11-26T15:00:00Z');listeners.visibilitychange();
assert(images.every(img=>img.attrs.src==='detective-leo-v2.png'));assert(images.every(img=>img.alt==='今日の案内役：レオ'));assert.equal(names[0].textContent,'今日の案内役：レオ');assert.equal(buttons[1].attrs['aria-pressed'],'false','locked guest pressed state also expires');assert.equal(buttons[1].textContent,'あと1こ');assert.equal(buttons[2].attrs['aria-pressed'],'true');
assert.strictEqual(document.activeElement,selectedAnswer);assert.strictEqual(question.answer,selectedAnswer);assert.deepEqual(question,{step:2,answer:{value:'選んだ答え',ariaPressed:'true',selectionStart:2,selectionEnd:4}});assert.equal(browserStorage.writes,0);
assert.equal(intervals.length,1);assert.equal(intervals[0].ms,60000);const count=queried.length;document.hidden=true;intervals[0].fn();listeners.visibilitychange();assert.equal(queried.length,count,'hidden pages are not touched');
document.hidden=false;intervals[0].fn();assert(queried.length>count);
browserStorage.data[KEY]='invalid';const oldImage=images[0].attrs.src;assert.doesNotThrow(()=>context.LearningContent.refreshGuide());assert.equal(images[0].attrs.src,oldImage,'read failure keeps current guide and learner state');
console.log('PASS: daily-guide store integration, legacy preference, same-day choice and expiry, answer/badge preservation, atomic save failure, exports, DOM-only midnight refresh, visibility and timer wiring.');
