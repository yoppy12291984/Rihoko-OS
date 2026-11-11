(function(root){
  'use strict';
  function levelFor(count){return Math.floor(Math.max(0,count)/10)+1;}
  function progressFor(count){return Math.max(0,count)%10;}
  function diceFor(date,index){
    var text=String(date||'')+'|'+String(index||0)+'|rihoko-adventure-v1',hash=2166136261;
    for(var i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
    return (hash>>>0)%6+1;
  }
  function journey(rewards){
    var steps=(rewards||[]).map(function(r,i){return diceFor(r.date,i+1);});
    return {steps:steps,total:steps.reduce(function(a,b){return a+b;},0)};
  }
  function lookFor(level){return (Math.max(1,Number(level)||1)-1)%6+1;}
  function imageFor(level){var look=lookFor(level);return look===1?'rihoko-adventurer-v2.png':'rihoko-level-'+look+'.png';}
  function portrait(compact,level){
    return '<img class="level-portrait'+(compact?' level-portrait--compact':'')+'" src="'+imageFor(level)+'" alt="Rihoko Lv. '+(level||1)+'の姿">';
  }
  function badge(count){
    var level=levelFor(count),progress=progressFor(count);
    return '<div class="level-hero">'+portrait(false,level)+'<div class="level-copy"><strong>Rihoko Lv. '+level+'</strong><span>次のレベルまで あと'+(10-progress)+'こ</span><div class="level-meter" aria-label="次のレベルまで '+progress+' / 10"><i style="width:'+progress*10+'%"></i></div></div></div>';
  }
  function titleFor(level){
    var titles=['はじめの冒険者','こつこつ冒険者','星をあつめる人','まなびの探検家','光のチャレンジャー','伝説をつくる人'];
    return titles[Math.min(titles.length-1,Math.max(0,level-1))];
  }
  function status(rewards,stats){
    rewards=rewards||[];stats=stats||{};
    var count=rewards.length,level=levelFor(count),progress=progressFor(count),trip=journey(rewards);
    return '<section class="rpg-status" aria-label="Rihokoのステータス"><header><span>STATUS</span><b>Rihoko</b></header><div class="rpg-status__body"><button type="button" class="rpg-status__portrait" data-rihoko-preview aria-label="Rihokoの全身画像を大きく見る">'+portrait(false,level)+'<span>タップで大きく</span></button><div class="rpg-status__main"><p class="rpg-status__title">称号　<span>'+titleFor(level)+'</span></p><div class="rpg-status__level"><span>LV</span><b>'+level+'</b></div><div class="rpg-status__exp"><span>EXP</span><b>'+progress*100+' / 1000</b><i><em style="width:'+progress*10+'%"></em></i><small>NEXT　あと '+(10-progress)+' スタンプ</small></div></div></div><dl class="rpg-status__stats"><div><dt>がんばった日</dt><dd>'+Number(stats.totalDays||0)+'</dd></div><div><dt>できたこと</dt><dd>'+Number(stats.completed||0)+'</dd></div><div><dt>まなび</dt><dd>'+Number(stats.units||0)+'</dd></div><div><dt>ぼうけん</dt><dd>'+trip.total+'マス</dd></div></dl></section>';
  }
  function showPortrait(level){
    var old=document.getElementById('rihokoPortraitPreview');if(old)old.remove();
    var el=document.createElement('div');el.id='rihokoPortraitPreview';el.className='character-preview';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Rihokoの全身画像');
    el.innerHTML='<section class="character-preview__card"><button type="button" class="character-preview__close" aria-label="閉じる">×</button><img src="'+imageFor(level)+'" alt="Rihokoの冒険者 全身画像"><p>Rihoko</p></section>';
    document.body.appendChild(el);var close=el.querySelector('button');function done(){el.remove();}
    close.onclick=done;el.onclick=function(e){if(e.target===el)done();};document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){document.removeEventListener('keydown',esc);done();}});close.focus();
  }
  function rolledKey(date){return 'riho-adventure-rolled-'+date;}
  function hasRolled(date){try{return root.localStorage.getItem(rolledKey(date))==='1';}catch(e){return false;}}
  function markRolled(date){try{root.localStorage.setItem(rolledKey(date),'1');return true;}catch(e){return false;}}
  function adventure(rewards,today){
    var trip=journey(rewards),count=rewards.length,die=trip.steps[rewards.findIndex(function(r){return r.date===today;})]||0,earned=rewards.some(function(r){return r.date===today;}),rolled=earned&&hasRolled(today);
    var shownTotal=trip.total-(earned&&!rolled?die:0);
    trip.total=shownTotal;
    var boardSize=30,map=Math.floor(shownTotal/boardSize)+1,pos=shownTotal%boardSize;
    var events={4:'⭐',9:'🎁',14:'🌈',19:'📚',24:'💎',29:'🏰'};
    var cells=Array.from({length:boardSize},function(_,i){var n=i+1,current=i===pos;return '<div class="adventure-space '+(current?'is-current ':'')+(events[i]?'is-event':'')+'" style="--order:'+i+'"><small>'+n+'</small>'+(events[i]?'<span class="adventure-event">'+events[i]+'</span>':'')+(current?portrait(true,levelFor(count)):'')+'</div>';}).join('');
    var action='';var feedback=arrival(shownTotal,die);
    if(earned&&!rolled)action='<button type="button" class="adventure-roll" id="adventureRoll">🎲 今日のサイコロをふる</button>';
    else if(earned)action='<p class="adventure-result" role="status">🎲 <b>'+die+'</b> が出て、'+die+'マス進んだよ！<br>マップ '+map+'・'+(pos+1)+'マス目に到着！<br>今日もがんばったね！'+feedback.found.map(function(t){return '<br>'+t.icon+' '+t.name+' をゲット！';}).join('')+'</p>';
    else action='<p class="adventure-result">次のスタンプでサイコロをふれるよ。</p>';
    return '<section class="adventure-map"><div class="adventure-head"><div><p>Rihokoの大冒険</p><h3>ぼうけんマップ '+map+'</h3></div><div class="adventure-distance">合計 <b>'+trip.total+'</b> マス</div></div><div class="adventure-board" aria-label="30マスの冒険マップ">'+cells+'</div>'+action+collection(shownTotal)+'<p class="adventure-note">出る目は1〜6。戻るマスや罰ゲームはないよ。</p></section>';
  }
  var treasures=[{icon:'⭐',name:'がんばりの星'},{icon:'🎁',name:'ひみつのプレゼント'},{icon:'🌈',name:'にじのリボン'},{icon:'📚',name:'知恵の本'},{icon:'💎',name:'きらめく宝石'},{icon:'🏰',name:'お城の勲章'}];
  function treasureCounts(total){return treasures.map(function(_,i){return Math.max(0,Math.floor((total-(i*5+4))/30)+1);});}
  function arrival(total,value){
    var before=treasureCounts(total-value),after=treasureCounts(total);
    var found=treasures.filter(function(_,i){return after[i]>before[i];});
    return {found:found,title:found.length?'宝物をみつけた！':'一歩ずつ、前へ！',message:'今日もがんばったね！ '+value+'マス進んだよ。',total:total};
  }
  function collection(total){var counts=treasureCounts(total);return '<section class="adventure-treasures"><h4>あつめた宝物</h4><div>'+treasures.map(function(t,i){return '<span class="'+(counts[i]?'is-owned':'')+'">'+t.icon+' '+t.name+' <b>×'+counts[i]+'</b></span>';}).join('')+'</div><small>特別なマスは通っても到着しても獲得。これまでの冒険分も含むよ。</small></section>';}
  function showArrival(result){
    var old=document.getElementById('adventureCelebration');if(old)old.remove();
    var previous=document.activeElement,el=document.createElement('div');el.id='adventureCelebration';el.className='level-celebration';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label',result.title);
    el.innerHTML='<section class="level-celebration__card"><h2>'+result.title+'</h2><div class="level-celebration__trophy">'+(result.found.length?result.found.map(function(t){return t.icon;}).join(''):'👏')+'</div><p>'+result.message+'</p>'+result.found.map(function(t){return '<p><b>'+t.name+' をゲット！</b></p>';}).join('')+'<p>マップ '+(Math.floor(result.total/30)+1)+'・'+(result.total%30+1)+'マス目に到着！</p><button type="button" class="level-celebration__close">やったね！</button></section>';
    function close(){document.removeEventListener('keydown',key);el.remove();if(previous&&previous.isConnected)previous.focus();}
    function key(e){if(e.key==='Escape')close();if(e.key==='Tab'){e.preventDefault();el.querySelector('button').focus();}}
    el.querySelector('button').onclick=close;document.addEventListener('keydown',key);document.body.appendChild(el);el.querySelector('button').focus();
  }
  var rolling=false;
  function roll(button,date,value,done,total){
    if(!button||button.disabled||rolling||hasRolled(date))return;rolling=true;button.disabled=true;var n=0;
    var timer=setInterval(function(){button.textContent='🎲 '+(n%6+1);n++;if(n>=12){clearInterval(timer);button.textContent='🎲 '+value+'！';
      var board=document.querySelector('.adventure-board'),cells=board?Array.from(board.children):[],start=cells.findIndex(function(c){return c.classList.contains('is-current');}),step=0;
      function advance(){
        if(step>=value){var saved=markRolled(date);rolling=false;done();if(saved&&Number.isFinite(total))showArrival(arrival(total,value));else if(!saved){var result=document.querySelector('.adventure-result')||document.getElementById('adventureRoll');if(result)result.textContent='冒険を保存できませんでした。もう一度ためしてね。';}return;}
        var prev=cells[(start+step)%30],next=cells[(start+step+1)%30],hero=prev&&prev.querySelector('img');
        if(hero&&next){prev.classList.remove('is-current');next.classList.add('is-current');next.appendChild(hero);}
        step++;setTimeout(advance,220);
      }
      setTimeout(advance,450);
    }},70);
  }
  function show(level){
    var old=document.getElementById('levelCelebration');if(old)old.remove();
    var el=document.createElement('div');el.id='levelCelebration';el.className='level-celebration';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','levelCelebrationTitle');
    el.innerHTML='<i class="firework" style="--x:18%;--y:23%;--c:#ffdb61;--d:0s"></i><i class="firework" style="--x:78%;--y:27%;--c:#ff7396;--d:.35s"></i><i class="firework" style="--x:28%;--y:72%;--c:#69e4d1;--d:.7s"></i><i class="firework" style="--x:83%;--y:73%;--c:#88b9ff;--d:1s"></i><section class="level-celebration__card"><h2 class="level-celebration__title" id="levelCelebrationTitle">LEVEL UP!</h2><div class="level-celebration__trophy" aria-hidden="true">🏆</div><div class="level-celebration__hero">'+portrait(false,level)+'<div class="level-celebration__level">Rihokoは<b>Lv. '+level+'</b>になった！</div></div><p class="level-celebration__message">スタンプ10こ、ゴールおめでとう！<br>髪型と衣装も変わったよ！ またひとつ成長したね。</p><button class="level-celebration__close" type="button">つぎの冒険へ！</button></section>';
    document.body.appendChild(el);var close=el.querySelector('button');function done(){el.remove();}close.onclick=done;el.onclick=function(e){if(e.target===el)done();};document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){document.removeEventListener('keydown',esc);done();}});close.focus();
  }
  var api={lookFor:lookFor,imageFor:imageFor,treasureCounts:treasureCounts,arrival:arrival,levelFor:levelFor,progressFor:progressFor,diceFor:diceFor,journey:journey,badge:badge,status:status,showPortrait:showPortrait,adventure:adventure,roll:roll,show:show};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RewardCelebration=api;
})(typeof window!=='undefined'?window:this);
