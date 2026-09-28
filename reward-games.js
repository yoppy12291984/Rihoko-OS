(function(root){
  'use strict';
  const dirs=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  function initialBoard(){const b=Array(64).fill(0);b[27]=b[36]=2;b[28]=b[35]=1;return b;}
  function flips(b,pos,player){
    if(b[pos]!==0)return [];
    const result=[],row=Math.floor(pos/8),col=pos%8;
    for(const [dr,dc] of dirs){let r=row+dr,c=col+dc,line=[];
      while(r>=0&&r<8&&c>=0&&c<8&&b[r*8+c]===3-player){line.push(r*8+c);r+=dr;c+=dc;}
      if(line.length&&r>=0&&r<8&&c>=0&&c<8&&b[r*8+c]===player)result.push(...line);
    }return result;
  }
  function moves(b,p){return b.map((_,i)=>i).filter(i=>flips(b,i,p).length);}
  function place(b,pos,p){const f=flips(b,pos,p);if(!f.length)return null;const next=b.slice();next[pos]=p;f.forEach(i=>next[i]=p);return next;}
  function allowed(items){return Array.isArray(items)&&items.length>0&&items.every(x=>x.done===true);}
  function deck(random=Math.random){const d=['🐨','🐱','🐼','🐬','🌸','🍎'];const a=d.concat(d);for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  const rules={initialBoard,flips,moves,place,allowed,deck};
  if(typeof module!=='undefined'&&module.exports){module.exports=rules;return;}
  let dialog,gate,kind='',game=null,timer,watch,opener;
  const day=()=>new Date().toLocaleDateString('en-CA');let gameDay='';
  function close(){clearTimeout(timer);clearInterval(watch);if(dialog&&dialog.open)dialog.close();if(opener&&opener.isConnected)opener.focus();}
  function check(){if(dialog&&dialog.open&&(!gate()||gameDay!==day())){close();game=null;return false;}return true;}
  function reset(){clearTimeout(timer);game=kind==='othello'?{board:initialBoard(),turn:1,note:'',over:false}:{cards:deck(),shown:[],matched:[],attempts:0,busy:false};draw();}
  function draw(){
    if(!check())return;
    const memory=kind==='memory';
    dialog.innerHTML='<div class="rg-top"><h2>'+ (memory?'神経衰弱':'オセロ') +'</h2><button data-close aria-label="ゲームをとじる">とじる ✕</button></div><p class="rg-intro">'+(memory?'2枚ずつめくって、同じ絵を6組見つけよう。':'あなたは黒、コンピューターは白。点のあるマスに置けるよ。')+'</p>'+(memory?memoryView():othelloView())+'<div class="rg-footer"><button data-reset>もう一度あそぶ</button><button data-close>今日はここまで</button></div>';
    dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);
    dialog.querySelector('[data-reset]').onclick=reset;
    dialog.querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>reveal(Number(b.dataset.card)));
    dialog.querySelectorAll('[data-cell]').forEach(b=>b.onclick=()=>move(Number(b.dataset.cell)));
  }
  function memoryView(){const complete=game.matched.length===12;
    return '<p class="rg-status" role="status">'+(complete?'🎉 全部そろった！ '+game.attempts+'回でクリア！':game.matched.length/2+' / 6組・めくった回数 '+game.attempts)+'</p><div class="rg-memory">'+game.cards.map((c,i)=>{const matched=game.matched.includes(i),up=matched||game.shown.includes(i);return '<button data-card="'+i+'" class="rg-card '+(up?'up':'')+' '+(matched?'matched':'')+'" '+(game.busy||up?'disabled':'')+' aria-label="'+(i+1)+'枚目 '+(up?c+(matched?' そろった':''):'裏向き')+'">'+(up?c:'?')+'</button>';}).join('')+'</div>';
  }
  function reveal(i){if(!check()||game.busy||game.shown.includes(i)||game.matched.includes(i))return;game.shown.push(i);
    if(game.shown.length===2){game.attempts++;const [a,b]=game.shown;if(game.cards[a]===game.cards[b]){game.matched.push(a,b);game.shown=[];}else{game.busy=true;timer=setTimeout(()=>{if(!check())return;game.shown=[];game.busy=false;draw();},1000);}}draw();
  }
  function othelloView(){const black=game.board.filter(x=>x===1).length,white=game.board.filter(x=>x===2).length,valid=moves(game.board,1);
    return '<p class="rg-score">● あなた '+black+'　○ コンピューター '+white+'</p><p class="rg-status" role="status">'+(game.over?(black>white?'🎉 あなたの勝ち！':black===white?'引き分け！ よくがんばったね。':'コンピューターの勝ち。また挑戦してね。'):game.note+(game.turn===1?'あなたの番だよ。':'コンピューターが考えています…'))+'</p><div class="rg-othello" aria-label="オセロ盤">'+game.board.map((v,i)=>'<button data-cell="'+i+'" '+(game.over||game.turn!==1||!valid.includes(i)?'disabled':'')+' aria-label="'+(Math.floor(i/8)+1)+'行'+(i%8+1)+'列 '+(v===1?'黒':v===2?'白':valid.includes(i)?'置けます':'空き')+'">'+(v?'<span class="rg-piece '+(v===2?'white':'')+'"></span>':game.turn===1&&valid.includes(i)?'<span class="rg-dot"></span>':'')+'</button>').join('')+'</div>';
  }
  function next(){
    if(!check())return;game.note='';
    if(!moves(game.board,game.turn).length){game.turn=3-game.turn;if(!moves(game.board,game.turn).length){game.over=true;draw();return;}game.note=game.turn===1?'白は置けないのでパス。':'黒は置けないのでパス。';}
    draw();if(game.turn===2)timer=setTimeout(()=>{if(!check())return;const options=moves(game.board,2);options.sort((a,b)=>score(b)-score(a));game.board=place(game.board,options[0],2);game.turn=1;next();},650);
  }
  function score(i){return ([0,7,56,63].includes(i)?100:0)+flips(game.board,i,2).length;}
  function move(i){if(!check()||game.turn!==1||game.over)return;const b=place(game.board,i,1);if(!b)return;game.board=b;game.turn=2;next();}
  function open(type,canPlay){if(!canPlay()||!['memory','othello'].includes(type))return;gate=canPlay;opener=document.activeElement;
    if(!dialog){dialog=document.createElement('dialog');dialog.className='reward-game';dialog.setAttribute('aria-label','ごほうびゲーム');document.body.appendChild(dialog);dialog.addEventListener('close',()=>{clearTimeout(timer);clearInterval(watch);});}
    kind=type;gameDay=day();dialog.showModal();reset();watch=setInterval(check,1000);dialog.querySelector('[data-close]').focus();
  }
  root.RewardGames={...rules,open,check};
})(typeof window!=='undefined'?window:this);
