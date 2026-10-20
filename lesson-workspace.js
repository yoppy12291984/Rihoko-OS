/* Keep the original vector format; use a larger, resizable editor and one-tap shapes. */
(function(root){
 'use strict';
 var base=typeof module!=='undefined'&&module.exports?require('./lesson-drawing.js'):root.LessonDrawing;
 function point(e,r){if(r.width<=0||r.height<=0)return null;return [Math.max(0,Math.min(600,(e.clientX-r.left)/r.width*600)),Math.max(0,Math.min(300,(e.clientY-r.top)/r.height*300))];}
 function rectangle(lines){var n=lines.filter(function(s){return s.tool==='rect';}).length%4;return {tool:'rect',points:[[45+(n%2)*290,35+Math.floor(n/2)*140],[265+(n%2)*290,145+Math.floor(n/2)*140]]};}
 function mount(el,value,onSave){
  var lines=base.validate(value||[]),active=null,pointer=null,expanded=false,scroll=0,previousOverflow='',color='#285a4b',width=3,allowTouch=false,liveStroke=null,mode="pen",undoStack=[],eraseBefore=null,pointBudget=120000;
  el.classList.add('lc-handwriting');
  el.innerHTML='<div class="lc-draw-header"><b>答え・考えの手書き欄</b><button type="button" data-expand aria-expanded="false">大きく開く</button></div><div class="lc-actions lc-draw-tools"><span>開いている間だけ書けるよ</span><label><input type="checkbox" data-finger> 指でも書く</label><label>色 <select data-color aria-label="ペンの色"><option value="#285a4b">黒緑</option><option value="#d84444">赤</option><option value="#246bce">青</option><option value="#219653">緑</option><option value="#e6ae13">黄</option></select></label><label>線 <select data-width aria-label="線の太さ"><option value="3">細い</option><option value="12">太い</option></select></label><button type="button" data-pen aria-pressed="true">ペン</button><button type="button" data-eraser aria-pressed="false">消しゴム（線ごと）</button><button type="button" data-undo>1つもどす</button></div><svg class="lc-drawing" viewBox="0 0 600 300" preserveAspectRatio="xMidYMid meet" role="img" aria-label="手書きの解答欄。Apple Pencilで文字や図を書けます"><rect width="600" height="300" fill="white"/><g fill="none" stroke="#285a4b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></g></svg><p class="lc-note">「大きく開く」を押すと書けます。閉じている間は見るだけです。指で書くときは「指でも書く」をオンに。画面を動かすときは枠の外をさわってね。</p><p role="status" data-drawing-status></p>';
  var svg=el.querySelector('svg'),g=el.querySelector('g'),note=el.querySelector('[data-drawing-status]'),expand=el.querySelector('[data-expand]');
  function paint(){g.innerHTML=base.shapes(lines.concat(active?[active]:[]));el.querySelector('[data-undo]').disabled=!lines.length&&!undoStack.length;}
  function persist(){try{onSave(base.validate(lines));note.textContent='手書きの答えをこの端末に保存しました。';}catch(e){note.textContent='図を保存できませんでした。画面を閉じずに、スクリーンショットで残してください。';}}
  function hasRoom(){if(lines.length>=1500||lines.reduce(function(n,s){return n+s.points.length;},0)>=119000){note.textContent='手書き欄がいっぱいです。「1つもどす」で整理してね。';return false;}return true;}
  function position(e){
   if(svg.getScreenCTM&&svg.createSVGPoint){var m=svg.getScreenCTM();if(m){var p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;try{p=p.matrixTransform(m.inverse());return [Math.max(0,Math.min(600,p.x)),Math.max(0,Math.min(300,p.y))];}catch(_){}}}
   return point(e,svg.getBoundingClientRect());
  }
  function erase(p){
   if(!p)return;
   lines=lines.filter(function(s){var pts=s.points;if(s.tool==='rect'){var a=pts[0],b=pts[pts.length-1];pts=[a,[b[0],a[1]],b,[a[0],b[1]],a];}
    for(var i=0;i<pts.length;i++){var a=pts[Math.max(0,i-1)],b=pts[i],dx=b[0]-a[0],dy=b[1]-a[1],n=dx*dx+dy*dy,t=n?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/n)):0;
     if(Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)<=10+(s.width||3)/2)return false;
    }return true;});paint();
  }
  function finish(e){if(pointer===null||e.pointerId!==pointer)return;e.preventDefault();e.stopPropagation();if(eraseBefore){undoStack.push(eraseBefore);eraseBefore=null;persist();}if(active){undoStack.push(lines.slice());if(e.type==='pointerup'){var p=position(e);if(p&&active.points.length<pointBudget)active.points.push(p);}lines.push(active);active=null;persist();}pointer=null;liveStroke=null;if(undoStack.length>30)undoStack.shift();paint();}
  svg.onpointerdown=function(e){if(!expanded||(e.pointerType==='touch'&&!allowTouch)||pointer!==null||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();e.stopPropagation();if(mode==="pen"&&!hasRoom())return;pointBudget=120000-lines.reduce(function(n,s){return n+s.points.length;},0);var p=position(e);if(!p)return;pointer=e.pointerId;if(mode==="eraser"){eraseBefore=lines.slice();try{svg.setPointerCapture(pointer);}catch(_){}erase(p);return;}active={tool:'pen',color:color,width:width,points:[p]};try{svg.setPointerCapture(pointer);}catch(_){}paint();liveStroke=g.lastElementChild;};
  svg.onpointermove=function(e){if(pointer!==e.pointerId)return;if(eraseBefore){e.preventDefault();e.stopPropagation();erase(position(e));return;}if(!active)return;e.preventDefault();e.stopPropagation();var samples=typeof e.getCoalescedEvents==='function'?e.getCoalescedEvents():[];if(!samples.length)samples=[e];var rect=svg.getBoundingClientRect();samples.forEach(function(sample){var p=position(sample);if(p&&active.points.length<pointBudget)active.points.push(p);});if(liveStroke)liveStroke.setAttribute('points',active.points.map(function(p){return p.join(',');}).join(' '));else paint();};
  svg.onpointerleave=function(e){if(!svg.hasPointerCapture||!svg.hasPointerCapture(e.pointerId))finish(e);};svg.onpointerup=finish;svg.onpointercancel=finish;svg.onlostpointercapture=finish;
  function choose(next){mode=next;el.querySelector('[data-pen]').setAttribute('aria-pressed',String(next==='pen'));el.querySelector('[data-eraser]').setAttribute('aria-pressed',String(next==='eraser'));}
  el.querySelector('[data-pen]').onclick=function(){choose('pen');};el.querySelector('[data-eraser]').onclick=function(){choose('eraser');};
  el.querySelector('[data-finger]').onchange=function(e){allowTouch=e.target.checked;};
  el.querySelector('[data-color]').onchange=function(e){color=e.target.value;};el.querySelector('[data-width]').onchange=function(e){width=Number(e.target.value);};
  el.querySelector('[data-undo]').onclick=function(){if(!expanded)return;if(undoStack.length)lines=undoStack.pop();else lines.pop();persist();paint();};
  function setExpanded(next){
   if(next===expanded)return;if(!next&&pointer!==null)finish({pointerId:pointer,type:'pointercancel',preventDefault:function(){},stopPropagation:function(){}});expanded=next;
   if(next){scroll=root.scrollY;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';el.classList.add('lc-drawing-expanded');el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','大きな手書き解答欄');}
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
  el.querySelectorAll('[data-cell]').forEach(function(b){b.onclick=function(){var i=Number(b.dataset.cell);cells[i]=cells[i]?'':color;paint();try{onSave(cells.slice());status.textContent='ぬった手書きの答えをこの端末に保存しました。';}catch(e){status.textContent='保存できませんでした。画面を閉じずに図を残してください。';}};});
  function toggle(){expanded=!expanded;if(expanded){scroll=root.scrollY;oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';el.classList.add('lc-drawing-expanded');el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','分数の図');}else{document.body.style.overflow=oldOverflow;el.classList.remove('lc-drawing-expanded');el.removeAttribute('role');el.removeAttribute('aria-modal');el.removeAttribute('aria-label');root.scrollTo(0,scroll);}expand.textContent=expanded?'問題にもどる':'大きく開く';expand.focus({preventScroll:true});}
  expand.onclick=toggle;el.onkeydown=function(e){if(expanded&&e.key==='Escape'){e.preventDefault();toggle();}if(expanded&&e.key==='Tab'){var bs=Array.from(el.querySelectorAll('button,select')),first=bs[0],last=bs[bs.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};paint();
 }
 var api={mountFraction:mountFraction,validate:base.validate,shapes:base.shapes,point:point,rectangle:rectangle,mount:mount};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LessonDrawing=api;
})(typeof window!=='undefined'?window:globalThis);
