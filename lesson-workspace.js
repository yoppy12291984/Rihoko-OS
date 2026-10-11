/* Keep the original vector format; use a larger, resizable editor and one-tap shapes. */
(function(root){
 'use strict';
 var base=typeof module!=='undefined'&&module.exports?require('./lesson-drawing.js'):root.LessonDrawing;
 function point(e,r){if(r.width<=0||r.height<=0)return null;return [Math.max(0,Math.min(600,(e.clientX-r.left)/r.width*600)),Math.max(0,Math.min(300,(e.clientY-r.top)/r.height*300))];}
 function rectangle(lines){var n=lines.filter(function(s){return s.tool==='rect';}).length%4;return {tool:'rect',points:[[45+(n%2)*290,35+Math.floor(n/2)*140],[265+(n%2)*290,145+Math.floor(n/2)*140]]};}
 function mount(el,value,onSave){
  var lines=base.validate(value||[]),active=null,pointer=null,expanded=false,scroll=0,previousOverflow='',color='#285a4b',width=3;
  el.innerHTML='<div class="lc-draw-header"><b>図をかこう</b><button type="button" data-expand aria-expanded="false">大きく開く</button></div><div class="lc-actions lc-draw-tools"><span>指・ペン・マウスで自由にかけるよ</span><label>色 <select data-color aria-label="ペンの色"><option value="#285a4b">黒緑</option><option value="#d84444">赤</option><option value="#246bce">青</option><option value="#219653">緑</option><option value="#e6ae13">黄</option></select></label><label>線 <select data-width aria-label="線の太さ"><option value="3">細い</option><option value="12">太い</option></select></label><button type="button" data-undo>1つもどす</button></div><svg class="lc-drawing" viewBox="0 0 600 300" preserveAspectRatio="none" role="img" aria-label="図をかく場所。指・ペン・マウスでかけます"><rect width="600" height="300" fill="white"/><g fill="none" stroke="#285a4b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></g></svg><p class="lc-note">色と線の太さを選んでかこう。画面を動かすときは、枠の外をさわってね。</p><p role="status" data-drawing-status></p>';
  var svg=el.querySelector('svg'),g=el.querySelector('g'),note=el.querySelector('[data-drawing-status]'),expand=el.querySelector('[data-expand]');
  function paint(){g.innerHTML=base.shapes(lines.concat(active?[active]:[]));el.querySelector('[data-undo]').disabled=!lines.length;}
  function persist(){try{onSave(base.validate(lines));note.textContent='図をこの端末に保存しました。';}catch(e){note.textContent='図を保存できませんでした。画面を閉じずに、スクリーンショットで残してください。';}}
  function hasRoom(){if(lines.length>=160||lines.reduce(function(n,s){return n+s.points.length;},0)>=23500){note.textContent='図がいっぱいです。「1つもどす」で整理してね。';return false;}return true;}
  function finish(e){if(pointer===null||e.pointerId!==pointer)return;e.preventDefault();e.stopPropagation();if(active){if(e.type==='pointerup'){var p=point(e,svg.getBoundingClientRect());if(p&&active.points.length<500)active.points.push(p);}lines.push(active);active=null;persist();}pointer=null;paint();}
  svg.onpointerdown=function(e){if(pointer!==null||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();e.stopPropagation();if(!hasRoom())return;var p=point(e,svg.getBoundingClientRect());if(!p)return;pointer=e.pointerId;active={tool:'pen',color:color,width:width,points:[p]};try{svg.setPointerCapture(pointer);}catch(_){}paint();};
  svg.onpointermove=function(e){if(pointer!==e.pointerId||!active)return;e.preventDefault();e.stopPropagation();var p=point(e,svg.getBoundingClientRect());if(p&&active.points.length<500)active.points.push(p);paint();};
  svg.onpointerup=finish;svg.onpointercancel=finish;svg.onlostpointercapture=finish;
  el.querySelector('[data-color]').onchange=function(e){color=e.target.value;};el.querySelector('[data-width]').onchange=function(e){width=Number(e.target.value);};
  el.querySelector('[data-undo]').onclick=function(){lines.pop();persist();paint();};
  function setExpanded(next){
   if(next===expanded)return;expanded=next;
   if(next){scroll=root.scrollY;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';el.classList.add('lc-drawing-expanded');el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','大きな描画画面');}
   else{el.classList.remove('lc-drawing-expanded');el.removeAttribute('role');el.removeAttribute('aria-modal');el.removeAttribute('aria-label');document.body.style.overflow=previousOverflow;root.scrollTo(0,scroll);}
   expand.textContent=next?'問題にもどる':'大きく開く';expand.setAttribute('aria-expanded',String(next));expand.focus({preventScroll:true});
  }
  expand.onclick=function(){setExpanded(!expanded);};
  el.onkeydown=function(e){if(!expanded)return;if(e.key==='Escape'){e.preventDefault();setExpanded(false);}if(e.key==='Tab'){var buttons=Array.from(el.querySelectorAll('button,select')).filter(function(b){return !b.disabled;}),first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
  paint();
 }

 function mountFraction(el,parts,value,onSave){
  var cells=Array.from({length:parts[0]+parts[1]},function(_,i){return value[i]||'';}),color='#246bce',expanded=false,oldOverflow='',scroll=0;
  el.innerHTML='<div class="lc-draw-header"><b>マスをタップしてぬろう</b><button data-expand type="button">大きく開く</button></div><div class="lc-actions"><label>ぬる色 <select data-color aria-label="ぬる色"><option value="#246bce">青</option><option value="#d84444">赤</option><option value="#219653">緑</option><option value="#e6ae13">黄</option></select></label></div><div class="lc-fractions">'+parts.map(function(n,row){return '<p>'+(row?'下':'上')+'：'+n+'等分</p><div class="lc-fraction-row" style="grid-template-columns:repeat('+n+',minmax(0,1fr))">'+Array.from({length:n},function(_,i){return '<button type="button" data-cell="'+(i+(row?parts[0]:0))+'" aria-label="'+(row?'下':'上')+'の'+(i+1)+'マス目"></button>';}).join('')+'</div>';}).join('')+'</div><p class="lc-note">もう一度押すと消せるよ。上も下も、全体の大きさは同じだよ。</p><p role="status" data-fraction-status></p>';
  var status=el.querySelector('[data-fraction-status]'),expand=el.querySelector('[data-expand]');
  function paint(){el.querySelectorAll('[data-cell]').forEach(function(b){var c=cells[Number(b.dataset.cell)];b.style.background=c||'#fff';b.textContent=c?'●':'';b.style.color=c==='#e6ae13'?'#222':'#fff';b.setAttribute('aria-pressed',String(!!c));});}
  el.querySelector('[data-color]').onchange=function(e){color=e.target.value;};
  el.querySelectorAll('[data-cell]').forEach(function(b){b.onclick=function(){var i=Number(b.dataset.cell);cells[i]=cells[i]?'':color;paint();try{onSave(cells.slice());status.textContent='ぬった図をこの端末に保存しました。';}catch(e){status.textContent='保存できませんでした。画面を閉じずに図を残してください。';}};});
  function toggle(){expanded=!expanded;if(expanded){scroll=root.scrollY;oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';el.classList.add('lc-drawing-expanded');el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','分数の図');}else{document.body.style.overflow=oldOverflow;el.classList.remove('lc-drawing-expanded');el.removeAttribute('role');el.removeAttribute('aria-modal');el.removeAttribute('aria-label');root.scrollTo(0,scroll);}expand.textContent=expanded?'問題にもどる':'大きく開く';expand.focus({preventScroll:true});}
  expand.onclick=toggle;el.onkeydown=function(e){if(expanded&&e.key==='Escape'){e.preventDefault();toggle();}if(expanded&&e.key==='Tab'){var bs=Array.from(el.querySelectorAll('button,select')),first=bs[0],last=bs[bs.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};paint();
 }
 var api={mountFraction:mountFraction,validate:base.validate,shapes:base.shapes,point:point,rectangle:rectangle,mount:mount};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LessonDrawing=api;
})(typeof window!=='undefined'?window:globalThis);
