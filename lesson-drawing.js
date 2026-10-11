/* Vector scratchpad: mouse, touch and pen share pointer capture. No navigation gestures. */
(function(root){
 'use strict';
 function validate(value){
  if(!Array.isArray(value)||value.length>160)throw Error('図が大きすぎます。');
  var count=0;
  return value.map(function(s){
   if(!s||!['pen','rect'].includes(s.tool)||!Array.isArray(s.points)||!s.points.length)throw Error('図の形式が不正です。');
   count+=s.points.length;if(count>24000)throw Error('図が大きすぎます。');
   var out={tool:s.tool,points:s.points.map(function(p){if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<0||p[0]>600||p[1]<0||p[1]>300)throw Error('図の座標が不正です。');return p.map(function(n){return Math.round(n*10)/10;});})};
   if(s.color!==undefined){if(!/^#[0-9a-f]{6}$/i.test(s.color))throw Error('図の色が不正です。');out.color=s.color;}
   if(s.width!==undefined){if(![3,12].includes(s.width))throw Error('線の太さが不正です。');out.width=s.width;}return out;
  });
 }
 function shapes(lines){return validate(lines).map(function(s){var a=s.points[0],b=s.points[s.points.length-1],style=' stroke="'+(s.color||'#285a4b')+'" stroke-width="'+(s.width||3)+'"';if(s.tool==='rect')return '<rect'+style+' x="'+Math.min(a[0],b[0])+'" y="'+Math.min(a[1],b[1])+'" width="'+Math.abs(a[0]-b[0])+'" height="'+Math.abs(a[1]-b[1])+'"/>';return '<polyline'+style+' points="'+s.points.map(function(p){return p.join(',');}).join(' ')+'"/>';}).join('');}
 function mount(el,value,onSave){
  var lines=validate(value||[]),tool='pen',active=null,pointer=null;
  el.innerHTML='<div class="lc-actions"><button type="button" data-tool="pen" aria-pressed="true">えんぴつ</button><button type="button" data-tool="rect" aria-pressed="false">長方形</button><button type="button" data-undo>1つもどす</button></div><svg class="lc-drawing" viewBox="0 0 600 300" preserveAspectRatio="none" role="img" aria-label="図をかく場所。指・ペン・マウスでかけます"><rect width="600" height="300" fill="white"/><g fill="none" stroke="#285a4b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></g></svg><p class="lc-note">長方形は、ななめに引っぱるとかけるよ。画面を動かすときは、枠の外をさわってね。</p><p role="status" data-drawing-status></p>';
  var svg=el.querySelector('svg'),g=el.querySelector('g'),note=el.querySelector('[data-drawing-status]');
  function paint(){g.innerHTML=shapes(lines.concat(active?[active]:[]));el.querySelector('[data-undo]').disabled=!lines.length;}
  function persist(){try{onSave(validate(lines));note.textContent='図をこの端末に保存しました。';}catch(e){note.textContent='図を保存できませんでした。画面を閉じずに、スクリーンショットで残してください。';}}
  function point(e){var r=svg.getBoundingClientRect();return [Math.max(0,Math.min(600,(e.clientX-r.left)/r.width*600)),Math.max(0,Math.min(300,(e.clientY-r.top)/r.height*300))];}
  function finish(e){if(pointer===null||e.pointerId!==pointer)return;e.preventDefault();e.stopPropagation();if(active){lines.push(active);active=null;persist();}pointer=null;paint();}
  svg.onpointerdown=function(e){if(pointer!==null||e.button>0)return;e.preventDefault();e.stopPropagation();if(lines.length>=160||lines.reduce(function(n,s){return n+s.points.length;},0)>=23500){note.textContent='図がいっぱいです。「1つもどす」で整理してね。';return;}pointer=e.pointerId;active={tool:tool,points:[point(e)]};svg.setPointerCapture(pointer);paint();};
  svg.onpointermove=function(e){if(pointer!==e.pointerId||!active)return;e.preventDefault();e.stopPropagation();var p=point(e);if(tool==='rect')active.points=[active.points[0],p];else if(active.points.length<500)active.points.push(p);paint();};
  svg.onpointerup=finish;svg.onpointercancel=finish;svg.onlostpointercapture=finish;
  el.querySelectorAll('[data-tool]').forEach(function(b){b.onclick=function(){tool=b.dataset.tool;el.querySelectorAll('[data-tool]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});};});
  el.querySelector('[data-undo]').onclick=function(){lines.pop();persist();paint();};paint();
 }
 var api={validate:validate,shapes:shapes,mount:mount};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LessonDrawing=api;
})(typeof window!=='undefined'?window:globalThis);
