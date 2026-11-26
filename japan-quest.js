(function(root){
  'use strict';
  var KEY='rihoko-japan-quest-v1';
  function copy(v){return JSON.parse(JSON.stringify(v));}
  function esc(v){return String(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function day(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date());}
  function shuffle(a){var out=a.slice();for(var i=out.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),v=out[i];out[i]=out[j];out[j]=v;}return out;}
  function createStore(storage,data){
    var state={version:1,seen:[],records:[],session:null},error='';
    var ids=data.prefectures.map(function(p){return p.id;});
    try{var raw=storage.getItem(KEY);if(raw){var s=JSON.parse(raw);if(s.version!==1||!Array.isArray(s.seen)||s.seen.some(function(id){return ids.indexOf(id)<0;})||!Array.isArray(s.records)||s.records.some(function(r){return ids.indexOf(r.id)<0||!['name','place'].includes(r.mode)||typeof r.self!=='boolean';})||(s.session&&(!Array.isArray(s.session.queue)||s.session.queue.some(function(id){return ids.indexOf(id)<0;})||!['name','place'].includes(s.session.mode)||!Number.isInteger(s.session.index)||s.session.index<0||s.session.index>s.session.queue.length)))throw Error('invalid');state=s;}}catch(e){error='前の記録を読み込めませんでした。元の記録を残すため、学習を始める前に記録の確認が必要です。';}
    function save(next){if(error)throw Error(error);storage.setItem(KEY,JSON.stringify(next));state=next;return copy(state);}
    function stats(id,mode){var list=state.records.filter(function(r){return r.id===id&&(!mode||r.mode===mode);});return {self:list.filter(function(r){return r.self;}).length,last:list[list.length-1]||null};}
    function round(next){var s=next.session,target=s.queue[s.index];s.wrong=0;s.hint=false;s.done=false;s.selected=null;if(target){var pool=data.prefectures.filter(function(p){return p.id!==target&&(s.region<0||p.region===s.region);});if(pool.length<2)pool=data.prefectures.filter(function(p){return p.id!==target;});s.choices=shuffle([target].concat(shuffle(pool).slice(0,2).map(function(p){return p.id;})));}return next;}
    return {get:function(){return copy(state);},error:function(){return error;},stats:stats,
      see:function(id){var next=copy(state);if(next.seen.indexOf(id)<0){next.seen.push(id);save(next);}},
      start:function(region,mode){var next=copy(state),pool=shuffle(data.prefectures.filter(function(p){return region<0||p.region===region;}));pool.sort(function(a,b){var x=stats(a.id,mode),y=stats(b.id,mode);return (x.last&&x.last.self?1:0)-(y.last&&y.last.self?1:0)||x.self-y.self;});next.session={region:region,mode:mode,queue:pool.slice(0,3).map(function(p){return p.id;}),index:0};return save(round(next));},
      hint:function(){var next=copy(state);if(next.session&&!next.session.done){next.session.hint=true;save(next);}},
      answer:function(id){var next=copy(state),s=next.session;if(!s||s.done||s.index>=s.queue.length)return false;s.selected=id;if(id!==s.queue[s.index]){s.wrong++;save(next);return false;}s.done=true;next.records.push({id:id,mode:s.mode,date:day(),self:!s.hint&&!s.wrong,hint:s.hint,wrong:s.wrong});if(next.seen.indexOf(id)<0)next.seen.push(id);save(next);return true;},
      next:function(){var next=copy(state);if(next.session&&next.session.done){next.session.index++;save(round(next));}}
    };
  }
  var store=null,region=-1,screen='closed',selected=26;
  var colors=['#8b95dc','#a398e4','#71b9d5','#78cbb6','#e4bb66','#eea788','#db97bd','#99be78'];
  function mount(host,options){
    if(!host||!root.JapanMapData)return;
    var data=root.JapanMapData;if(!store)store=createStore(root.localStorage,data);
    // Enter a dedicated map tab without resetting an in-progress quiz.
    if(options&&options.open&&screen==='closed')screen='explore';
    function pref(id){return data.prefectures.find(function(p){return p.id===id;});}
    function name(p){return '<ruby>'+p.name+'<rt>'+p.reading+'</rt></ruby>';}
    function act(fn){try{fn();render();}catch(e){var el=host.querySelector('[data-jq-error]');if(el)el.textContent='保存できませんでした。'+e.message;}}
    function map(s){
      var play=screen==='play'&&s&&s.index<s.queue.length,locate=play&&s.mode==='place',target=play?s.queue[s.index]:selected;
      return '<div class="jq-map-wrap"><span class="jq-north">↑ 北</span><svg class="jq-map" viewBox="'+data.viewBox+'" aria-label="日本の都道府県の地図">'+data.prefectures.map(function(p){var active=region<0||p.region===region,glow=(!locate||s.done||s.hint)&&p.id===target;return '<g data-jq-pref="'+p.id+'" class="jq-pref '+(active?'':'is-muted ')+(glow?'is-target':'')+'" style="--pref:'+colors[p.region]+'"'+(active?' tabindex="0" role="button" aria-label="'+(locate&&!s.hint&&!s.done?'地図の場所 '+p.id:p.name)+'"':' aria-hidden="true"')+'>'+p.paths.map(function(q){return '<path d="'+q.d+'" transform="'+q.transform+'"/>';}).join('')+'</g>';}).join('')+'</svg><button type="button" data-jq-whole>日本全体を見る</button></div>';
    }
    function render(){
      var db=store.get(),s=db.session,active=s&&s.index<s.queue.length,score=Array.from(new Set(db.records.filter(function(r){return r.self;}).map(function(r){return r.id;}))).length;
      if(screen==='closed'){host.innerHTML='<section class="jq-entry"><span>社会 · 地図のぼうけん</span><h3>にほんを、少しずつ旅しよう。</h3><p>名前を知らなくても大丈夫。地図をさわるところから。</p><button type="button" data-jq-open>🗾 日本地図をひらく</button>'+(active?'<button type="button" data-jq-resume>前のつづき（'+(s.index+1)+' / '+s.queue.length+'問）</button>':'')+'</section>';host.querySelector('[data-jq-open]').onclick=function(){screen='explore';render();};var resume=host.querySelector('[data-jq-resume]');if(resume)resume.onclick=function(){screen='play';region=s.region;render();};return;}
      var playing=screen==='play'&&active,done=screen==='play'&&s&&!active,target=playing?pref(s.queue[s.index]):pref(selected);
      var regions='<nav class="jq-regions" aria-label="地方をえらぶ"><button data-jq-region="-1" aria-pressed="'+(region===-1)+'">日本全体</button>'+data.regions.map(function(r,i){return '<button data-jq-region="'+i+'" aria-pressed="'+(region===i)+'">'+r+'</button>';}).join('')+'</nav>';
      var body='';
      if(done){var completed=db.records.slice(-s.queue.length);body='<section class="jq-finish"><span>✦</span><h3>今日の旅、おつかれさま！</h3><p>'+s.queue.length+'か所をたずねたね。</p><ul>'+completed.map(function(r){return '<li>'+name(pref(r.id))+'<small>'+(r.self?'ひとりで答えた':r.hint?'手がかりを見てたしかめた':'もう一度考えて答えた')+'</small></li>';}).join('')+'</ul><p>ここでおしまいでも大丈夫。また会いにいこう。</p><button data-jq-explore>地図にもどる</button></section>';}
      else if(playing){body=map(s)+'<section class="jq-question"><span class="jq-eyebrow">'+(s.index+1)+' / '+s.queue.length+' 問 · '+(s.mode==='name'?'名前のたび':'場所のたび')+'</span><h3>'+(s.mode==='name'?'金色のところの名前は？':name(target)+'はどこかな？')+'</h3><p>'+(s.mode==='name'?'地図を見て、名前を一つえらぼう。':'地図の場所をタップしてね。地方ごとに大きくして遊べるよ。')+'</p>'+(s.mode==='name'?'<div class="jq-choices">'+s.choices.map(function(id){return '<button data-jq-answer="'+id+'" '+(s.done?'disabled':'')+'>'+name(pref(id))+'</button>';}).join('')+'</div>':'')+'<div class="jq-feedback" role="status">'+(s.done?'○ '+name(target)+'！ '+(s.wrong||s.hint?'たしかめられたね。':'見つけたね！'):s.wrong?'そこは '+name(pref(s.selected))+'。もう一度、見てみよう。':'ゆっくり考えていいよ。')+'</div>'+(s.done?'<button class="jq-primary" data-jq-next>'+(s.index+1===s.queue.length?'旅をおわる':'つぎの場所へ')+'</button>':'<button data-jq-hint>'+(s.hint?'手がかりを表示中':'手がかりを見る')+'</button>'+(s.hint?'<p class="jq-hint">'+(s.mode==='name'?'読み方は「'+target.reading.slice(0,1)+'」から始まるよ。':'金色の場所をたしかめて、もう一度タップしてみよう。')+'</p>':''))+'<button data-jq-pause>ここでひと休み</button></section>';}
      else {var group=data.prefectures.filter(function(p){return region<0||p.region===region;});body=map(null)+'<section class="jq-discovery"><span class="jq-eyebrow">さわって、見つける</span><h3>'+name(target)+'</h3><p>'+data.regions[target.region]+'地方'+(target.region===0?'（北海道）':'')+'にあるよ。地図の金色のところを見てみよう。</p><div class="jq-start"><button class="jq-primary" data-jq-start="name">名前をえらぶ · '+Math.min(3,group.length)+'問</button><button data-jq-start="place">場所をさがす · '+Math.min(3,group.length)+'問</button></div><p class="jq-help">まずは好きな地方だけでOK。時間制限はないよ。</p><div class="jq-names">'+group.map(function(p){return '<button data-jq-see="'+p.id+'" aria-pressed="'+(p.id===selected)+'">'+name(p)+'</button>';}).join('')+'</div></section>';}
      host.innerHTML='<section class="jq-app"><header><div><span class="jq-eyebrow">SOCIAL STUDIES · JAPAN</span><h2>にほん地図のぼうけん</h2></div><button data-jq-close>とじる</button></header><p class="jq-progress">出会った場所 '+db.seen.length+' / 47　·　ひとりで答えた場所 '+score+' / 47</p>'+(active&&!playing?'<button type="button" data-jq-resume>前のつづき（'+(s.index+1)+' / '+s.queue.length+'問）</button>':'')+(!playing&&!done?regions:'')+'<p data-jq-error role="alert">'+esc(store.error())+'</p><div class="jq-content '+(done?'is-finished':'')+'">'+body+'</div><footer><p>記録はこの端末だけに保存します。「ひとりで答えた」は、その問題で手がかりやまちがいがなかった記録です。</p><details><summary>地図について</summary><p>'+data.note+'</p><p>地図原図：<a href="'+data.source+'" target="_blank" rel="noopener">Kevin Matsubara / Japan vector map</a> · <a href="JAPAN-MAP-LICENSE.txt" target="_blank">MIT License</a></p></details></footer></section>';
      host.querySelector('[data-jq-close]').onclick=function(){screen='closed';render();};
      var continueButton=host.querySelector('[data-jq-resume]');if(continueButton)continueButton.onclick=function(){screen='play';region=s.region;render();};
      host.querySelectorAll('[data-jq-region]').forEach(function(b){b.onclick=function(){region=+b.dataset.jqRegion;var p=data.prefectures.find(function(p){return region<0||p.region===region;});selected=p.id;render();};});
      host.querySelectorAll('[data-jq-pref],[data-jq-see]').forEach(function(b){var id=+(b.dataset.jqPref||b.dataset.jqSee);function select(){if(region>=0&&pref(id).region!==region)return;if(playing){if(s.mode==='place')act(function(){store.answer(id);});}else{selected=id;act(function(){store.see(id);});}}b.onclick=select;if(b.hasAttribute('data-jq-pref'))b.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}};});
      host.querySelectorAll('[data-jq-start]').forEach(function(b){b.onclick=function(){act(function(){store.start(region,b.dataset.jqStart);screen='play';});};});
      host.querySelectorAll('[data-jq-answer]').forEach(function(b){b.onclick=function(){act(function(){store.answer(+b.dataset.jqAnswer);});};});
      var next=host.querySelector('[data-jq-next]');if(next)next.onclick=function(){act(function(){store.next();});};var hint=host.querySelector('[data-jq-hint]');if(hint)hint.onclick=function(){act(function(){store.hint();});};
      var pause=host.querySelector('[data-jq-pause]');if(pause)pause.onclick=function(){screen='closed';render();};var explore=host.querySelector('[data-jq-explore]');if(explore)explore.onclick=function(){screen='explore';render();};
      var svg=host.querySelector('.jq-map');if(svg&&region>=0){var boxes=Array.from(svg.querySelectorAll('.jq-pref:not(.is-muted)')).map(function(g){return g.getBBox();});var x=Math.min.apply(null,boxes.map(function(b){return b.x;})),y=Math.min.apply(null,boxes.map(function(b){return b.y;})),r=Math.max.apply(null,boxes.map(function(b){return b.x+b.width;})),bt=Math.max.apply(null,boxes.map(function(b){return b.y+b.height;}));svg.setAttribute('viewBox',[x-28,y-28,r-x+56,bt-y+56].join(' '));}var whole=host.querySelector('[data-jq-whole]');if(whole)whole.onclick=function(){svg.setAttribute('viewBox',data.viewBox);};
    }
    render();
  }
  var api={createStore:createStore,mount:mount};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JapanQuest=api;
})(typeof window!=='undefined'?window:globalThis);
