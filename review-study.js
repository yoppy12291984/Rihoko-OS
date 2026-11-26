/* 塾の復習。問題・初回の答え・援助・再挑戦を分け、端末内に保存する。 */
(function(root){
  'use strict';
  var Adaptive=typeof module!=='undefined'&&module.exports?require('./adaptive-lessons.js'):root.AdaptiveLessons;
  var Experience=typeof module!=='undefined'&&module.exports?require('./learning-experience.js'):root.LearningExperience;
  var KEY='rihoko-review-v1', ratings={self:'自分でできた',reread:'設問を読み直すとできた',hint:'ヒントでできた',explain:'解説を読んでわかった',later:'また今度ためす'};
  function copy(v){return JSON.parse(JSON.stringify(v));}
  function canRateSelf(r){return !r.hadMistake&&(r.check&&r.check.correct&&r.check.assisted===false||!r.hintSeen&&!r.solutionSeen);}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function text(v,max){if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('教材の文字数・形式を確認してください。');return v;}
  function ident(v){if(typeof v!=='string'||!/^[a-z0-9][a-z0-9-]{0,79}$/.test(v))throw Error('教材IDの形式が違います。');return v;}
  function validatePack(raw){
    if(typeof raw==='string'){if(raw.length>300000)throw Error('教材は300KB以内にしてください。');raw=JSON.parse(raw);}
    if(!raw||raw.format!=='rihoko-review-v1'||!Number.isInteger(raw.revision)||raw.revision<1||raw.revision>9999)throw Error('復習教材の形式・版が違います。');
    var p={format:raw.format,id:ident(raw.id),revision:raw.revision,title:text(raw.title,120),lessons:[]};
    if(!Array.isArray(raw.lessons)||!raw.lessons.length||raw.lessons.length>50)throw Error('教材は1〜50件にしてください。');
    var seen=[];
    p.lessons=raw.lessons.map(function(l){
      var id=ident(l.id);if(seen.includes(id))throw Error('問題IDが重複しています。');seen.push(id);
      if(!['算数','国語','理科','社会','英語'].includes(l.subject)||!Number.isInteger(l.minutes)||l.minutes<1||l.minutes>10||!Array.isArray(l.questions)||l.questions.length!==2)throw Error('教科・時間・2問の構成を確認してください。');
      return {id:id,skill:l.skill||null,subject:l.subject,title:text(l.title,120),minutes:l.minutes,questions:l.questions.map(function(q){
        var out={prompt:text(q.prompt,2000),hint:text(q.hint,800),answer:text(q.answer,1500),explanation:text(q.explanation,3000)};
        if(q.choices!==undefined){if(!Array.isArray(q.choices)||![3,4,5].includes(q.choices.length)||new Set(q.choices).size!==q.choices.length||!Number.isInteger(q.correctChoice)||q.correctChoice<0||q.correctChoice>=q.choices.length)throw Error('選択肢を確認してください。');out.choices=q.choices.map(c=>text(c,1500));out.correctChoice=q.correctChoice;}
        if(q.passage)out.passage=text(q.passage,4000);
        if(q.diagram!==undefined){if(![2,3,4].includes(q.diagram))throw Error('図の形式が違います。');out.diagram=q.diagram;}return out;
      })};
    });return p;
  }
  function createStore(storage,bundled){
    var data={format:KEY,packs:[],sessions:[]},loadError='';
    try{var raw=storage.getItem(KEY);if(raw){var parsed=JSON.parse(raw);if(parsed.format!==KEY||!Array.isArray(parsed.packs)||!Array.isArray(parsed.sessions))throw Error();data=parsed;}}catch(e){loadError='保存した復習記録を読み込めません。記録を上書きせず停止しています。';}
    bundled=bundled.map(validatePack);
    function commit(next){if(loadError)throw Error(loadError);storage.setItem(KEY,JSON.stringify(next));data=next;}
    function packs(){var all=bundled.concat(data.packs).concat(data.practice||[]),by=Object.create(null);all.forEach(function(p){if(!by[p.id]||by[p.id].revision<p.revision)by[p.id]=p;});return Object.keys(by).map(function(k){return by[k];});}
    function start(p,l,fresh){
      var old=data.sessions.filter(function(s){return s.pack.id===p.id&&s.pack.revision===p.revision&&s.lesson.id===l.id;}).slice(-1)[0];
      if(old&&!fresh)return copy(old);
      var now=new Date().toISOString(),s={id:'r-'+Date.now()+'-'+Math.random().toString(36).slice(2,10),pack:{id:p.id,revision:p.revision,title:p.title},lesson:copy(l),startedAt:now,updatedAt:now,step:0,responses:[{},{}],events:[]};
      var next=copy(data);next.sessions.push(s);commit(next);return copy(s);
    }
    function session(id){var s=data.sessions.find(function(x){return x.id===id;});return s?copy(s):null;}
    function update(id,step,patch,event){
      var next=copy(data),s=next.sessions.find(function(x){return x.id===id;});if(!s||![0,1].includes(step))throw Error('復習記録が見つかりません。');
      var r=s.responses[step],now=new Date().toISOString();
      if(['hint','solution','rating'].includes(event)&&r.initial===undefined)r.initial={answer:r.answer||'',drawing:copy(r.drawing||[]),at:now};
      if(patch.answer!==undefined){if(typeof patch.answer!=='string'||patch.answer.length>6000)throw Error('答えは6000文字以内にしてください。');if(r.answer!==patch.answer){r.answer=patch.answer;delete r.rating;delete r.check;}}
      if(patch.drawing!==undefined){r.drawing=root.LessonDrawing.validate(patch.drawing);delete r.rating;}
      if(patch.hintSeen){r.hintSeen=true;delete r.rating;}
      if(patch.solutionSeen){r.solutionSeen=true;delete r.rating;}
      if(patch.rating){if(!ratings[patch.rating])throw Error('ふり返りの形式が違います。');if(patch.rating==='self'&&!canRateSelf(r))throw Error('ヒントや解説を使った記録を選んでください。');r.rating=patch.rating;}
      if(patch.note!==undefined)r.note=String(patch.note).slice(0,2000);
      if(patch.step!==undefined){if(![0,1].includes(patch.step))throw Error('段階の形式が違います。');s.step=patch.step;}
      if(event)s.events.push({at:now,step:step,action:event,answer:r.answer||'',rating:r.rating||''});
      s.updatedAt=now;commit(next);return copy(s);
    }
    function practiceFor(next,s,step){
      const source=s.id+'/'+step,existing=(next.practice||[]).find(p=>p.source===source);if(existing)return existing;
      const skill=s.lesson.skill||(s.pack.id==='review-foundations'?s.lesson.id:null);if(!Adaptive.titles[skill])return null;
      const serial=(next.practice||[]).filter(p=>p.lessons[0].skill===skill).length+1;
      const lesson=Adaptive.review(skill,serial),p={format:KEY,id:'practice-'+skill+'-'+serial,revision:1,title:'苦手に合わせた類題',source,lessons:[lesson]};
      (next.practice||(next.practice=[])).push(p);return p;
    }
    function check(id,step){
      if(![0,1].includes(step))throw Error('問題が見つかりません。');
      const next=copy(data),s=next.sessions.find(s=>s.id===id);if(!s)throw Error('記録が見つかりません。');
      const q=s.lesson.questions[step],r=s.responses[step];if(!q.choices||!q.choices.includes(r.answer))throw Error('先に答えを選んでね。');
      const last=(r.attempts||[]).slice(-1)[0];if(r.check&&last&&last.answer===r.answer)return {correct:r.check.correct,repeat:true};
      const correct=r.answer===q.choices[q.correctChoice],now=new Date().toISOString();
      if(!r.initial)r.initial={answer:r.answer,at:now};
      const assisted=!!(r.hintSeen||r.solutionSeen);
      r.check={correct,at:now,assisted};(r.attempts||(r.attempts=[])).push({answer:r.answer,correct,at:now,assisted});
      r.solutionSeen=true;r.feedbackSeen=true;
      let p;if(!correct){r.hadMistake=true;p=practiceFor(next,s,step);}
      s.updatedAt=now;commit(next);return {correct,practice:p&&p.id};
    }
    function importPack(raw){var p=validatePack(raw),all=packs(),old=all.find(function(x){return x.id===p.id;});if(old&&old.revision>=p.revision)throw Error('同じ教材は、今より新しい版番号で取り込んでください。');var next=copy(data);next.packs.push(p);commit(next);return p;}
    // Old free-form work was not automatically marked. Only an explicit "try later"
    // or an existing failed check is evidence for adding practice; never guess from handwriting.
    if(!loadError){try{const next=copy(data),before=(next.practice||[]).length;next.sessions.forEach(s=>s.responses.forEach((r,i)=>{if(r.rating==='later'||(r.check&&r.check.correct===false))practiceFor(next,s,i);}));if((next.practice||[]).length!==before)commit(next);}catch(e){loadError='復習問題を保存できません。保存容量を確認して、もう一度開いてください。前の記録は保持しています。';}}
    return {check:check,packs:packs,start:start,session:session,update:update,importPack:importPack,error:function(){return loadError;},exportData:function(){return copy({format:KEY,exportedAt:new Date().toISOString(),packs:packs(),sessions:data.sessions});}};
  }
  function diagram(n){
    if(!n)return '';var w=n*80+60,lines='',dots='';
    for(var i=0;i<=n;i++){var x=20+i*80;lines+='<path d="M'+x+' 130V50l30 -25v80l-30 25m30 -105v80"/>';[[x,50],[x,130],[x+30,25],[x+30,105]].forEach(function(p){dots+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4"/>';});}
    [[20,50],[20,130],[50,25],[50,105]].forEach(function(p){lines+='<path d="M'+p[0]+' '+p[1]+'h'+n*80+'"/>';});
    return '<svg class="rs-cubes" viewBox="0 0 '+w+' 155" role="img" aria-label="立方体'+n+'こを横につなぎ、となり合う面を共通に使った図"><g fill="none" stroke="currentColor" stroke-width="2">'+lines+'</g><g fill="currentColor">'+dots+'</g></svg>';
  }
  function questionHtml(q){return (q.passage?'<blockquote>'+esc(q.passage)+'</blockquote>':'')+'<p class="rs-prompt">'+esc(q.prompt)+'</p>'+diagram(q.diagram);}
  function printHtml(l,answers){return '<!doctype html><html lang="ja"><meta charset="utf-8"><title>'+esc(l.title)+(answers?'・解答解説':'・問題')+'</title><style>@page{size:A4;margin:18mm}body{font-family:sans-serif;line-height:1.8;color:#263b37}h1{font-size:20px}h2{font-size:17px}.rs-prompt,blockquote{white-space:pre-wrap}.rs-cubes{width:240px;height:130px}.space{height:65mm;border-bottom:1px solid #aaa}article+article{break-before:page}button{padding:12px}@media print{button{display:none}}</style><body><button onclick="window.print()">印刷 / PDF保存</button>'+l.questions.map(function(q,i){return '<article><h1>'+esc(l.title)+(answers?' — 保護者用解答・解説':'')+'</h1><p>なまえ：________________　日づけ：________________</p><h2>'+(i?'数字・場面をかえた1問':'まず1問')+'</h2>'+questionHtml(q)+(q.choices?'<ol>'+q.choices.map(c=>'<li>'+esc(c)+'</li>').join('')+'</ol>':'')+(answers?'<h3>答え</h3><p>'+esc(q.answer)+'</p><h3>考え方</h3><p>'+esc(q.explanation)+'</p><h3>迷ったときの小さなヒント</h3><p>'+esc(q.hint)+'</p>':'<div class="space"></div><p>自分で ／ 設問の読み直し ／ ヒントで ／ 解説のあと ／ また今度</p>')+'</article>';}).join('')+'</body></html>';}
  var store=null,selected=null,host=null,parentMode=false,message='',importDraft='',exportText='';
  function getStore(){if(!store)store=createStore(root.localStorage,root.ReviewPacks||[]);return store;}
  function status(s){return s.responses.every(function(r){return !!r.rating;})?'ふり返り済み':'続きから';}
  function dateLabel(iso){return new Date(iso).toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'});}
  function draw(){
    if(!host)return;var db=getStore();host.className='review-study learning-content';
    if(db.error()){host.innerHTML='<p role="alert">'+esc(db.error())+'</p>';return;}
    if(parentMode){admin();return;}
    var s=selected&&db.session(selected),all=db.exportData(),packs=db.packs();
    document.body.classList.toggle('app--lesson-active',!!s);
    function act(fn){try{fn();draw();}catch(e){notice('保存できませんでした：'+e.message);}}
    if(!s){
      function cards(list){return list.map(p=>'<section><h3>'+esc(p.title)+'</h3>'+p.lessons.map(l=>{
        var last=all.sessions.filter(x=>x.pack.id===p.id&&x.pack.revision===p.revision&&x.lesson.id===l.id).slice(-1)[0];
        return '<article class="rs-card"><small>'+esc(l.subject)+' · '+l.minutes+'分</small><h3>'+esc(l.title)+'</h3><button data-review-open="'+p.id+'/'+l.id+'">'+(last?'続き・前の答えを見る':'選んで答える')+'</button>'+(last?'<button data-review-fresh="'+p.id+'/'+l.id+'">同じ問題をもう一度</button>':'')+'</article>';
      }).join('')+'</section>').join('');}
      const practice=packs.filter(p=>p.id.startsWith('practice-'));
      host.innerHTML='<header class="rs-hero"><p class="rs-eyebrow">まちがいは、次の手がかり</p><h2>選んで、ひとつずつ。</h2><p>答えを選んで「答え合わせ」。間違えた問題には、同じ考え方の類題が増えるよ。</p></header><div class="rs-list">'+(practice.length?'<h2>苦手に合わせた類題</h2>'+cards(practice.slice().reverse()):'')+'<details open><summary>これまでの問題を復習</summary>'+cards(packs.filter(p=>!p.id.startsWith('practice-')))+'</details></div><details><summary>前の取り組みを見る（'+all.sessions.length+'件）</summary>'+all.sessions.slice().reverse().map(x=>'<p><button data-session="'+esc(x.id)+'">'+esc(dateLabel(x.startedAt)+' '+x.lesson.title)+'</button></p>').join('')+'</details><p class="rs-note">問題と記録はこの端末・ブラウザーに保存されます。過去の問題も何度でも選べます。</p><p role="status" data-rs-status>'+esc(message)+'</p>';
      ['open','fresh'].forEach(kind=>host.querySelectorAll('[data-review-'+kind+']').forEach(b=>b.onclick=()=>act(()=>{const [pid,lid]=b.getAttribute('data-review-'+kind).split('/'),p=packs.find(p=>p.id===pid),l=p.lessons.find(l=>l.id===lid);selected=db.start(p,l,kind==='fresh').id;message='';})));
      host.querySelectorAll('[data-session]').forEach(b=>b.onclick=()=>{selected=b.dataset.session;message='';draw();});return;
    }
    var i=s.step,q=s.lesson.questions[i],r=s.responses[i],choiceMode=!!q.choices;
    const feedback=r.check?(r.check.correct?'<div class="lc-correct"><span class="lc-correct-circle">○</span><strong>正解！ よくできたね。</strong></div>':'<div class="lc-retry">もう一度考えてみよう。'+(Adaptive.titles[s.lesson.skill||s.lesson.id]?'この考え方の類題を一覧に追加したよ。':'')+'</div>'):'';
    host.innerHTML='<button data-rs-back>一覧にもどる</button><header><p>'+esc(s.lesson.subject)+' · '+(i+1)+' / 2問</p><h2>'+esc(s.lesson.title)+'</h2></header><nav class="rs-steps">'+[0,1].map(n=>'<button data-rs-step="'+n+'" aria-current="'+(i===n?'step':'false')+'">'+(n+1)+'問目</button>').join('')+'</nav><article class="rs-question">'+questionHtml(q)+'<button data-rs-learn>まだ知らない・わからない → 先に学ぼう</button>'+(choiceMode?'<div class="lc-choices" role="group" aria-label="答えを選ぼう">'+q.choices.map((c,n)=>'<button data-rs-choice="'+n+'" aria-pressed="'+(r.answer===c)+'">'+(n+1)+'. '+esc(c)+'</button>').join('')+'</div><button data-rs-check>答え合わせ</button><div role="status" aria-live="polite">'+feedback+'</div><div data-rs-celebration></div>':'<p>以前の記録です。選択式で復習すると、前の記録を残して新しく始められます。</p><p>前の答え：'+esc(r.answer||'文字の答えなし')+'</p><div data-old-drawing></div><button data-rs-upgrade>選択式で復習する</button>')+'<div class="rs-actions"><button data-rs-hint>小さなヒント</button><button data-rs-solution>答え・解説</button></div>'+(r.hintSeen?'<aside class="rs-hint">'+esc(q.hint)+'</aside>':'')+(r.solutionSeen?Experience.explanationHtml(q,{subject:s.lesson.subject,title:s.lesson.title,skill:s.lesson.skill||s.lesson.id}):'')+(choiceMode?'<fieldset><legend>ふり返り</legend>'+Object.keys(ratings).map(k=>'<button data-rs-rating="'+k+'" '+(k==='self'&&!canRateSelf(r)?'disabled':'')+' aria-pressed="'+(r.rating===k)+'">'+ratings[k]+'</button>').join('')+'</fieldset>':'')+'<p role="status" data-rs-status>'+esc(message)+'</p></article><div class="rs-actions">'+(!i?'<button data-rs-step="1">次の1問</button>':'')+'<button data-rs-back>今日はここまで</button></div><details><summary>おうちの人へ・記録と印刷</summary><p>最初の答え：'+esc(r.initial?r.initial.answer:'まだ答え合わせしていません')+'</p><p>答え合わせ '+(r.attempts||[]).length+'回</p><p>'+esc(r.note||'')+'</p><button data-rs-print="questions">問題を印刷</button><button data-rs-print="answers">解答・解説を印刷</button></details>';
    host.querySelectorAll('[data-rs-choice]').forEach(b=>b.onclick=()=>act(()=>{db.update(s.id,i,{answer:q.choices[Number(b.dataset.rsChoice)]},'choice');message='この端末に保存しました';}));
    const check=host.querySelector('[data-rs-check]');if(check)check.onclick=function(){try{const result=db.check(s.id,i);message='答え合わせと学んだ記録を保存しました';draw();if(!result.repeat)Experience.celebrate(host.querySelector('[data-rs-celebration]'),result.correct);}catch(e){notice('保存できませんでした：'+e.message);}};
    host.querySelectorAll('[data-rs-back]').forEach(b=>b.onclick=()=>{selected=null;message='';draw();});
    host.querySelectorAll('[data-rs-step]').forEach(b=>b.onclick=()=>act(()=>{db.update(s.id,i,{step:Number(b.dataset.rsStep)},'step');message='';}));
    host.querySelector('[data-rs-hint]').onclick=()=>act(()=>db.update(s.id,i,{hintSeen:true},'hint'));
    host.querySelector('[data-rs-solution]').onclick=()=>act(()=>db.update(s.id,i,{solutionSeen:true},'solution'));
    host.querySelector('[data-rs-learn]').onclick=function(){try{db.update(s.id,i,{solutionSeen:true},'solution');message='先に学んでから答えても大丈夫。解説のあとでためした記録が残るよ。';draw();var teaching=host.querySelector('.lx-explanation');if(teaching){teaching.setAttribute('tabindex','-1');teaching.focus({preventScroll:true});teaching.scrollIntoView({block:'start'});}}catch(e){notice('保存できませんでした：'+e.message);}};
    host.querySelectorAll('[data-rs-rating]').forEach(b=>b.onclick=()=>act(()=>db.update(s.id,i,{rating:b.dataset.rsRating},'rating')));
    const upgrade=host.querySelector('[data-rs-upgrade]');if(upgrade)upgrade.onclick=()=>act(()=>{const p=packs.find(p=>p.id===s.pack.id),l=p&&p.lessons.find(l=>l.id===s.lesson.id);if(!l||!l.questions.every(q=>q.choices))throw Error('この追加教材には選択肢がありません。保護者画面から選択式の新版を取り込んでください。');selected=db.start(p,l,true).id;});
    if(!choiceMode&&r.drawing&&r.drawing.length&&root.LessonDrawing)root.LessonDrawing.mount(host.querySelector('[data-old-drawing]'),r.drawing,()=>{});
    host.querySelectorAll('[data-rs-print]').forEach(b=>b.onclick=()=>{const popup=root.open('','_blank');if(!popup){notice('印刷画面を開けませんでした。');return;}popup.opener=null;popup.document.write(printHtml(s.lesson,b.dataset.rsPrint==='answers'));popup.document.close();});
  }

  function notice(value){var n=host&&host.querySelector('[data-rs-status]');if(n)n.textContent=value;}
  function admin(){
    var db=getStore(),sessions=db.exportData().sessions;
    host.innerHTML='<h2>塾の復習：教材と記録</h2><p>このチャットで作った復習教材を追加できます。内蔵教材はアプリの更新で届きます。個別の教材ファイルを取り込む場合は、使うiPadでも取り込んでください。</p><p>選択式で間違えた問題には類題を自動追加します。回答・過去の手書き・ふり返りは端末内保存です。家族の端末には自動共有されません。</p><details><summary>復習教材を追加する</summary><label>教材ファイル（JSON）<input data-rs-import-file type="file" accept=".json,application/json"></label><label>教材データを貼り付ける<textarea data-rs-import rows="4" maxlength="300000">'+esc(importDraft)+'</textarea></label><button data-rs-take>取り込む</button></details><button data-rs-export>復習記録を書き出す</button><details data-rs-export-box><summary>書き出した記録をコピーする</summary><textarea readonly data-rs-export-text rows="5">'+esc(exportText)+'</textarea></details><p role="status" data-rs-status>'+esc(message)+'</p><h3>取り組みの記録</h3>'+(sessions.length?sessions.slice().reverse().map(function(s){return '<details><summary>'+esc(dateLabel(s.startedAt))+' · '+esc(s.lesson.title)+' · '+status(s)+'</summary>'+s.responses.map(function(r,i){return '<section><h4>'+(i?'別の1問':'最初の1問')+'</h4><p>初回：'+esc(r.initial?(r.initial.answer||((r.initial.drawing||[]).length?'手書きあり':'未入力')):'まだ確定していません')+'</p><p>現在：'+esc(r.answer||((r.drawing||[]).length?'手書きあり':'未入力'))+'</p><p>ヒント：'+(r.hintSeen?'開いた':'開いていない')+' ／ 解説：'+(r.solutionSeen?'開いた':'開いていない')+'</p><p>ふり返り：'+esc(ratings[r.rating]||'未記録')+'</p><p>'+esc(r.note||'')+'</p></section>';}).join('')+'</details>';}).join(''):'<p>まだ取り組みの記録はありません。</p>');
    host.querySelector('[data-rs-import]').oninput=function(e){importDraft=e.target.value;};
    function take(raw){try{var p=db.importPack(raw);message=p.title+'を取り込みました。';importDraft='';}catch(e){message='取り込めませんでした：'+e.message;}draw();}
    host.querySelector('[data-rs-take]').onclick=function(){take(importDraft);};
    host.querySelector('[data-rs-import-file]').onchange=async function(e){var f=e.target.files[0];if(!f)return;if(f.size>300000){notice('教材は300KB以内にしてください。');return;}try{take(await f.text());}catch(err){notice('ファイルを読み込めませんでした。');}};
    host.querySelector('[data-rs-export]').onclick=function(){exportText=JSON.stringify(db.exportData(),null,2);host.querySelector('[data-rs-export-text]').value=exportText;host.querySelector('[data-rs-export-box]').open=true;var url=URL.createObjectURL(new Blob([exportText],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='塾の復習記録.json';a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);notice('保存できない場合は、表示した記録をコピーしてこのチャットへ渡せます。');};
  }
  var api={canRateSelf:canRateSelf,createStore:createStore,validatePack:validatePack,printHtml:printHtml,diagram:diagram,mount:function(el,parent){if(!el)return;host=el;parentMode=!!parent;draw();},isWorking:function(){return !!selected&&!parentMode;}};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ReviewStudy=api;
})(typeof window!=='undefined'?window:globalThis);
