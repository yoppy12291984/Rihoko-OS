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
  function portrait(compact){
    return '<img class="level-portrait'+(compact?' level-portrait--compact':'')+'" src="'+(compact?'rihoko-adventurer-compact-v1.png?v=20261006-2':'rihoko-adventurer-v2.png?v=20261006-2')+'" alt="里穂子の冒険者アイコン">';
  }
  function badge(count){
    var level=levelFor(count),progress=progressFor(count);
    return '<div class="level-hero">'+portrait()+'<div class="level-copy"><strong>里穂子 Lv. '+level+'</strong><span>次のレベルまで あと'+(10-progress)+'こ</span><div class="level-meter" aria-label="次のレベルまで '+progress+' / 10"><i style="width:'+progress*10+'%"></i></div></div></div>';
  }
  function titleFor(level){
    var titles=['はじめの冒険者','こつこつ冒険者','星をあつめる人','まなびの探検家','光のチャレンジャー','伝説をつくる人'];
    return titles[Math.min(titles.length-1,Math.max(0,level-1))];
  }
  function status(rewards,stats){
    rewards=rewards||[];stats=stats||{};
    var count=rewards.length,level=levelFor(count),progress=progressFor(count),trip=journey(rewards);
    return '<section class="rpg-status" aria-label="里穂子のステータス"><header><span>STATUS</span><b>里穂子</b></header><div class="rpg-status__body"><div class="rpg-status__portrait">'+portrait(false)+'</div><div class="rpg-status__main"><p class="rpg-status__title">称号　<span>'+titleFor(level)+'</span></p><div class="rpg-status__level"><span>LV</span><b>'+level+'</b></div><div class="rpg-status__exp"><span>EXP</span><b>'+progress*100+' / 1000</b><i><em style="width:'+progress*10+'%"></em></i><small>NEXT　あと '+(10-progress)+' スタンプ</small></div></div></div><dl class="rpg-status__stats"><div><dt>がんばった日</dt><dd>'+Number(stats.totalDays||0)+'</dd></div><div><dt>できたこと</dt><dd>'+Number(stats.completed||0)+'</dd></div><div><dt>まなび</dt><dd>'+Number(stats.units||0)+'</dd></div><div><dt>ぼうけん</dt><dd>'+trip.total+'マス</dd></div></dl></section>';
  }
  function rolledKey(date){return 'riho-adventure-rolled-'+date;}
  function hasRolled(date){try{return root.localStorage.getItem(rolledKey(date))==='1';}catch(e){return false;}}
  function markRolled(date){try{root.localStorage.setItem(rolledKey(date),'1');}catch(e){}}
  function adventure(rewards,today){
    var trip=journey(rewards),count=rewards.length,die=count?trip.steps[count-1]:0,earned=rewards.some(function(r){return r.date===today;}),rolled=earned&&hasRolled(today);
    var boardSize=30,map=Math.floor(trip.total/boardSize)+1,pos=trip.total%boardSize;
    var events={4:'⭐',9:'🎁',14:'🌈',19:'📚',24:'💎',29:'🏰'};
    var cells=Array.from({length:boardSize},function(_,i){var n=i+1,current=i===pos;return '<div class="adventure-space '+(current?'is-current ':'')+(events[i]?'is-event':'')+'" style="--order:'+i+'"><small>'+n+'</small>'+(current?portrait(true):events[i]||'')+'</div>';}).join('');
    var action='';
    if(earned&&!rolled)action='<button type="button" class="adventure-roll" id="adventureRoll">🎲 今日のサイコロをふる</button>';
    else if(earned)action='<p class="adventure-result">きょうは <b>'+die+'</b> が出て、'+die+'マス進んだよ！</p>';
    else action='<p class="adventure-result">次のスタンプでサイコロをふれるよ。</p>';
    return '<section class="adventure-map"><div class="adventure-head"><div><p>里穂子の大冒険</p><h3>ぼうけんマップ '+map+'</h3></div><div class="adventure-distance">合計 <b>'+trip.total+'</b> マス</div></div><div class="adventure-board" aria-label="30マスの冒険マップ">'+cells+'</div>'+action+'<p class="adventure-note">出る目は1〜6。戻るマスや罰ゲームはないよ。</p></section>';
  }
  function roll(button,date,value,done){
    if(!button)return;button.disabled=true;var n=0;
    var timer=setInterval(function(){button.textContent='🎲 '+(n%6+1);n++;if(n>=12){clearInterval(timer);markRolled(date);button.textContent='🎲 '+value+'！';setTimeout(done,500);}},70);
  }
  function show(level){
    var old=document.getElementById('levelCelebration');if(old)old.remove();
    var el=document.createElement('div');el.id='levelCelebration';el.className='level-celebration';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','levelCelebrationTitle');
    el.innerHTML='<i class="firework" style="--x:18%;--y:23%;--c:#ffdb61;--d:0s"></i><i class="firework" style="--x:78%;--y:27%;--c:#ff7396;--d:.35s"></i><i class="firework" style="--x:28%;--y:72%;--c:#69e4d1;--d:.7s"></i><i class="firework" style="--x:83%;--y:73%;--c:#88b9ff;--d:1s"></i><section class="level-celebration__card"><h2 class="level-celebration__title" id="levelCelebrationTitle">LEVEL UP!</h2><div class="level-celebration__trophy" aria-hidden="true">🏆</div><div class="level-celebration__hero">'+portrait()+'<div class="level-celebration__level">里穂子は<b>Lv. '+level+'</b>になった！</div></div><p class="level-celebration__message">スタンプ10こ、ゴールおめでとう！<br>がんばった力が またひとつ増えたよ。</p><button class="level-celebration__close" type="button">つぎの冒険へ！</button></section>';
    document.body.appendChild(el);var close=el.querySelector('button');function done(){el.remove();}close.onclick=done;el.onclick=function(e){if(e.target===el)done();};document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){document.removeEventListener('keydown',esc);done();}});close.focus();
  }
  var api={levelFor:levelFor,progressFor:progressFor,diceFor:diceFor,journey:journey,badge:badge,status:status,adventure:adventure,roll:roll,show:show};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RewardCelebration=api;
})(typeof window!=='undefined'?window:this);
