/* Teaching support is presentation data. It never rewrites a saved question. */
(function(root){
  'use strict';
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function guide(subject,title){
    var rows=subject==='理科'?root.ScienceGuides:subject==='社会'?root.SocialGuides:[];
    if(typeof module!=='undefined'&&module.exports&&!rows){try{rows=require(subject==='理科'?'./science-guides.js':'./social-guides.js');}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}}
    return (rows||[]).find(function(g){return g.title===title;})||null;
  }
  var reviewGuides={
    gaps:{title:'あいだの数',intro:'「ならべた物の数」と「あいだの数」は、同じではないよ。横一列の石は、最初の1こだけではあいだがないね。そこに石を1こ足すたび、あいだも1か所ふえる。両はしの外には置かないので、あいだは石より1つ少ない。あいだに入れる石が何こずつかも、わけて考えよう。',example:'赤い石が3こなら、赤・白・赤・白・赤。白を入れるあいだは2か所。1か所に白2こなら、白は2×2＝4こになる。',steps:['はじめにならんでいる石の数から1を引き、あいだが何か所あるか調べる。','あいだの数×1か所に入れる数で、あとから置く石を求める。','「全部で」と聞かれたら、はじめの石と、あとから置く石を足す。'],mistakes:'あいだの数を、はじめの石と同じ数にしないこと。両はしの外まで置く問題とは区別するよ。'},
    groups:{title:'聞かれた人数',intro:'人数の問題では、まず「だれの人数を聞かれているか」を決めよう。クラス全員の中に男の子と女の子がいて、男の子の中にも条件に合う人と合わない人がいる。大きな仲間のまとまりから、小さなまとまりへ順番に分けると、どこから何を引けばよいか分かるよ。',example:'全部で10人、女の子が4人なら男の子は6人。その男の子のうち赤い帽子が2人なら、赤い帽子ではない男の子は6−2＝4人。',steps:['全体から女の子の人数を引いて、男の子の人数を出す。','その男の子を、帽子やかばんなどの条件で、二つの仲間に分ける。','求めるのが「持っていない人」なら、男の子全員から「持っている人」を引く。'],mistakes:'クラス全員から帽子やかばんの人数だけを引くと、女の子まで答えに入ってしまうよ。'},
    'shared-edges':{title:'共有する面',intro:'立方体は、さいころのような形。角が8か所、角と角を結ぶ辺が12本あるよ。二つの立方体を面でつなぐと、つなぎ目は両方がいっしょに使う。玉も棒も同じ場所を2回数えないことが大切。まず1こを作り、次の1こに新しく足す分だけを考えよう。',example:'1こ目は玉8こ・棒12本。2こ目はつなぎ目の玉4こ・棒4本を共通に使えるので、新しく足すのは玉4こ・棒8本だよ。',steps:['最初の立方体を1こ作る分、玉8こ・棒12本を用意する。','残りの立方体1こにつき、玉4こ・棒8本を足す。','玉は「こ」、棒は「本」で別々に数えて、つなぎ目を二重に数えていないか確かめる。'],mistakes:'単に立方体の個数を8や12にかけると、つなぎ目まで2回数えてしまうよ。ここでは横一列につなぐ条件だよ。'},
    containers:{title:'箱の内と外',intro:'箱の中にかご、かごの中に袋が入るような問題では、数える物をそろえよう。「かご1こ」と「袋1袋」は、そのまま足せないね。先にかごを袋の数に直す。箱の外にある物も忘れず足してから、最後に聞かれた物が袋なのか、あめなのかを確かめよう。',example:'1かごに3袋。箱の中に2かご、箱の外に1かごと2袋なら、袋は3×2＋3＋2＝11袋。1袋に2このあめなら、あめは11×2＝22こ。',steps:['箱の中のかごの数×1かごの袋の数で、箱の中の袋を求める。','箱の外のかごも袋の数に直し、ばらの袋といっしょに足す。','袋を聞かれたらそこで答える。あめを聞かれた時だけ、1袋に入る数をかける。'],mistakes:'問題に書かれた数を全部かけるわけではないよ。袋を数える時には、1袋のあめの数は使わない。'},
    balance:{title:'同じ重さ',intro:'「同じ重さ」は、てんびんがつり合うということ。つり合った組を同じ数ずつ増やしても、同じ数の組に分けても、つり合いは保たれるよ。二つの式で共通する色や形に注目し、その数をそろえると、別の色のおもりの重さも比べられる。個数が違っても、重さが等しい場合があるんだ。',example:'赤2こ＝青3こを2組にすると、赤4こ＝青6こ。赤4こ＝黄2こでもあるなら、黄2こ＝青6こ。両方を2組に分けると、黄1こ＝青3こ。',steps:['両方の文に出てくる色や形を見つけ、そのおもりの数をそろえる。','同じ重さの組に置きかえて、聞かれている二つの色や形をつなぐ。','片方が1こになるよう、両方を同じ数の組に分ける。'],mistakes:'片方だけ数を増やしたり減らしたりすると、つり合いは保てないよ。おもりの個数と重さを混同しないでね。'},
    quote:{title:'本文の言葉',intro:'国語で「本文からそのまま取り出す」と言われたら、自分の考えを足さず、書かれた言葉を使うよ。「理由」は、なぜその行動をしたのかということ。「ので」「から」などの近くを手がかりに探そう。行動した後の気持ちを想像できても、本文にない言葉なら、そのまま取り出した答えにはならないんだ。',example:'「雨が降ったので、あおいは傘を開きました。」で行動の理由は「雨が降ったので」。「ぬれたくなかったから」は考えられる理由だけれど、本文の言葉そのものではないね。',steps:['まず、だれが何をしたのか、その行動が書かれた所を見つける。','「なぜ？」につながる理由の言葉を、本文の前後から探す。','選択肢と本文を一文字ずつ見比べる。行動そのものや、書かれていない想像を選ばない。'],mistakes:'「意味が合いそう」と「本文にそのまま書いてある」は別。自分の言葉で答える問題なら、指示に合わせて考え方を変えるよ。'}
  };
  function reviewGuide(q,context){
    context=context||{};var g=reviewGuides[context.skill];if(!g)return null;
    return {title:g.title,intro:g.intro,example:g.example,steps:g.steps.slice(),mistakes:g.mistakes};
  }
  function guideHtml(g){
    if(!g)return '';
    return '<section class="lx-guide" aria-label="はじめてでもわかる学び"><h3>まず、ここから学ぼう</h3><p>'+esc(g.intro)+'</p>'+(g.example?'<section class="lx-example"><h4>たとえば</h4><p>'+esc(g.example)+'</p></section>':'')+(Array.isArray(g.steps)&&g.steps.length?'<h4>順番に考えると</h4><ol>'+g.steps.map(function(s){return '<li>'+esc(s)+'</li>';}).join('')+'</ol>':'')+(g.mistakes?'<section class="lx-mistake"><h4>ここを、かんちがいしやすいよ</h4><p>'+esc(g.mistakes)+'</p></section>':'')+'</section>';
  }
  function explanationHtml(q,context){
    q=q||{};context=context||{};
    var g=context.guide||guide(context.subject,context.title)||reviewGuide(q,context);
    var reasoning=(String(q.explanation||'').match(/[^。\n]+。?/g)||[]).map(function(s){return s.trim();}).filter(Boolean);
    return '<div class="lx-explanation">'+guideHtml(g)+'<section class="lx-worked"><h3>この問題を、いっしょに解こう</h3><p class="lx-question">'+esc(q.question||q.prompt||'')+'</p><p class="lx-answer"><b>答え：</b>'+esc(q.answer)+'</p>'+(reasoning.length?'<ol>'+reasoning.map(function(s){return '<li>'+esc(s)+'</li>';}).join('')+'</ol>':'<p>答えと問題の条件を、ひとつずつくらべてみよう。</p>')+(q.hint?'<p><b>考える手がかり：</b>'+esc(q.hint)+'</p>':'')+'</section><p class="lx-next">はじめは知らなくても大丈夫。分かったことを一つ見つけたら、次の問題でためしてみよう。</p></div>';
  }
  function celebrate(host,correct){
    if(!host)return null;var doc=host.ownerDocument||root.document;if(!doc)return null;
    var old=host.querySelector('.lx-celebration');if(old){if(old._lxTimer)root.clearTimeout(old._lxTimer);old.remove();}
    var box=doc.createElement('div'),reduced=!!(root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches);
    box.className='lx-celebration '+(correct?'lx-success':'lx-effort')+(reduced?' lx-still':'');box.setAttribute('role','status');box.setAttribute('aria-live','polite');
    var art=doc.createElement('span');art.className='lx-medal';art.setAttribute('aria-hidden','true');art.textContent=correct?'★':'✦';box.appendChild(art);
    var label=doc.createElement('strong');label.textContent=correct?'できたね！ 考えた力がふえたよ。':'考えて答えたね！ 新しい発見をもらおう。';box.appendChild(label);
    if(!reduced){var stars=doc.createElement('span');stars.className='lx-sparkles';stars.setAttribute('aria-hidden','true');for(var i=0;i<6;i++){var star=doc.createElement('i');star.textContent='✦';star.style.setProperty('--lx-i',i);stars.appendChild(star);}box.appendChild(stars);}
    if(host.insertBefore)host.insertBefore(box,host.firstChild);else host.appendChild(box);
    if(!reduced)box._lxTimer=root.setTimeout(function(){var sparks=box.querySelector('.lx-sparkles');if(sparks)sparks.remove();box.classList.add('lx-still');box._lxTimer=null;},1600);
    return box;
  }
  var api={guide:guide,reviewGuide:reviewGuide,guideHtml:guideHtml,explanationHtml:explanationHtml,celebrate:celebrate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LearningExperience=api;
})(typeof window!=='undefined'?window:globalThis);
