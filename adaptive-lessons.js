/* Versioned, deterministic lesson rules. No network or learner data is sent. */
(function(root){
  'use strict';
  const START='2026-11-23', DAY=86400000;
  function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function choice(prompt,answer,wrong,explanation,seed){
    const choices=[String(answer),...wrong.map(String)];
    if(![3,5].includes(choices.length)||new Set(choices).size!==choices.length)throw Error('選択肢が重複しています');
    let h=hash(seed);for(let i=choices.length-1;i>0;i--){h=(Math.imul(h,1664525)+1013904223)>>>0;const j=h%(i+1);[choices[i],choices[j]]=[choices[j],choices[i]];}
    return {prompt,question:prompt,answer:String(answer),choices,correctChoice:choices.indexOf(String(answer)),explanation,hint:'何を聞かれているか、条件を一つずつたしかめよう。',workspace:'text'};
  }
  function numbers(prompt,n,unit,explanation,seed){return choice(prompt,n+unit,[n-1,n+1,n+2,n+3].map(x=>x+unit),explanation,seed);}
  const titles={gaps:'あいだの数',groups:'聞かれた人数', 'shared-edges':'共有する面',containers:'箱の内と外',balance:'同じ重さ',quote:'本文の言葉'};
  function review(skill,serial){
    if(!titles[skill]||!Number.isSafeInteger(serial)||serial<1)throw Error('この教材の類題ルールはまだありません。');
    const qs=[0,1].map(i=>{const n=serial*2+i+1,seed=skill+'/'+n;let q;
      if(skill==='gaps'){const a=12+n%18,b=1+Math.floor(n/18)%3,total=a+(a-1)*b;q=numbers(`青い石${a}こを横一列にならべます。となり合う青い石のあいだ全部に、白い石を${b}こずつ入れます。両はしの外には置きません。石は全部で何こ？`,total,'こ',`あいだは${a}−1＝${a-1}か所。${a}＋${a-1}×${b}＝${total}こ。`,seed);}
      if(skill==='groups'){const a=26+n%13,g=10+n%8,h=2+n%5,v=a-g-h;q=numbers(`クラスは${a}人で、女の子は${g}人です。男の子のうち${h}人が赤いかばんです。赤いかばんではない男の子は何人？`,v,'人',`男の子は${a}−${g}＝${a-g}人。その中の${h}人を引くと${v}人。`,seed);}
      if(skill==='shared-edges'){const a=2+n%7,balls=4*a+4,sticks=8*a+4;q=choice(`立方体${a}こを横一列につなぎます。となり合う面の玉と棒は共通です。玉と棒の数は？`,`玉${balls}こ・棒${sticks}本`,[`玉${8*a}こ・棒${12*a}本`,`玉${balls+4}こ・棒${sticks+8}本`],`最初の1こは玉8こ・棒12本。残り${a-1}こは、1こごとに玉4こ・棒8本を足す。`,seed);if(a<=4)q.diagram=a;}
      if(skill==='containers'){const bags=2+n%4,baskets=3+n%3,loose=1+n%2,extra=1+n%3,candy=2+n%3,total=bags*(baskets+loose)+extra,askCandy=i===1;q=numbers(`1袋にあめ${candy}こ。1かごに${bags}袋、1箱に${baskets}かご入ります。1箱と、箱の外に${loose}かご、さらに${extra}袋あります。${askCandy?'あめは何こ？':'袋は何袋？'}`,askCandy?total*candy:total,askCandy?'こ':'袋',`袋は${bags}×(${baskets}＋${loose})＋${extra}＝${total}袋。`+(askCandy?`あめは${total}×${candy}＝${total*candy}こ。`:'聞かれたのは袋なので、1袋のあめの数は使わない。'),seed);}
      if(skill==='balance'){const b=3+n%6,m=2+n%4;q=numbers(`赤2こ＝青${b}こ、赤${2*m}こ＝黄${m}この重さです。同じ色のおもりは同じ重さです。黄1こは青何こ分？`,b,'こ',`赤${2*m}こ＝青${b*m}こ＝黄${m}こ。${m}こずつの組に分けると、黄1こ＝青${b}こ。`,seed);}
      if(skill==='quote'){const cases=[['図書室が休みだったので','あかり','本を借りるのを明日にしました','今日は本を読めないと思ったから'],['風が強くなったので','ゆい','外に出していた紙を家へ運びました','紙が飛ばされそうで心配だったから'],['電車が止まっていたので','はる','別の道を調べました','早く着く道をさがしたかったから'],['鉢の土がかわいていたので','みな','じょうろを持って来ました','植物に水が必要だと思ったから'],['友だちが荷物を落としたので','けい','立ち止まってひろいました','友だちを助けたかったから'],['入口に工事中と書いてあったので','そら','係の人に別の入口を聞きました','入ってはいけないと思ったから']];const c=cases[n%cases.length];q=choice(`${c[1]}が行動した理由を、本文からそのまま取り出したものはどれ？`,c[0],[c[3],c[2].replace('。','')], '「本文からそのまま」は、意味が似ている言いかえではなく、実際に書かれた言葉を選ぶ。',seed);q.passage=`${c[0]}、${c[1]}は${c[2]}。`;}
      return q;
    });
    return {id:skill+'-practice-'+serial,skill,subject:skill==='quote'?'国語':'算数',title:titles[skill]+'の類題 '+serial,minutes:3,questions:qs};
  }
  function date(now){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now||new Date());}
  function monday(now){const d=new Date(date(now)+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
  function lesson(subject,index,stamp){
    const n=index+1,k=index%6,a=8+n%11,b=3+n%4,seed=stamp+subject;let title,passage,items;
    const q=(p,answer,wrong,exp)=>choice(p,answer,wrong,exp,seed+'/'+p);
    if(subject==='理科'){
      if(k===0){title='日なたと日かげの温度調査';passage=`同じ日の同じ時こく、同じ地面で調べた練習用の記録です。日なたは${20+a}℃、日かげは${20+a-b}℃。同じ種類の温度計を使いました。`;items=[q('この記録から言えることは？',`日なたの方が${b}℃高い`,[`日かげの方が${b}℃高い`,'どちらも同じ温度'],`差は${20+a}−${20+a-b}＝${b}℃。`),q('日なたか日かげかの違いをくらべるとき、そろえるのは？','調べる時こくと地面の種類',['日なたは朝、日かげは昼にする','日なたは土、日かげは水にする'],'調べたい条件以外をそろえる。'),q('この1回だけで「いつでも必ず同じ温度差」と言える？','言えない。別の日にも調べる',['言える。1回で十分','温度計の色だけ変えれば言える'],'天気や時こくで結果は変わりうる。')];}
      if(k===1){title='磁石につく物の捜査';passage=`${n}回目の調査。鉄のくぎ${b}本と鉄のクリップ${a}こは磁石につきました。アルミはく・木・プラスチックはつきませんでした。材料は名前のとおりです。`;items=[q('ついた物に共通する材料は？','鉄',['木','アルミニウム'],'形が違っても、どちらも鉄。'),q('「金属は全部つく」に合わない記録は？','アルミはくはつかなかった',['鉄のくぎはついた','木はつかなかった'],'アルミニウムも金属。金属すべてが磁石につくわけではない。'),q('大きさの違う鉄のクリップをくらべるとき、同じにするのは？','磁石と近づけ方',['一方だけ別の強い磁石にする','一方だけ紙で包む'],'調べたい大きさ以外の条件をそろえる。')];}
      if(k===2){title='植物の成長記録';passage=`同じ種類の植物AとB。はじめはどちらも${a}cm。1週間後、Aは${a+b}cm、Bは${a+2*b}cmでした。Aは日なた、Bは日かげで育て、水の量も違っていました。練習用の記録です。`;items=[q('この1週間にBがのびた長さは？',`${2*b}cm`,[`${a+2*b}cm`,`${b}cm`],`終わりの高さからはじめの高さを引く。`),q('「日かげだけが、Bがよくのびた理由」と言える？','言えない。水の量も違う',['言える。高さだけで決まる','言える。名前がBだから'],'光と水の2つの条件が変わっている。'),q('光の違いを調べ直すなら？','同じ種類・はじめの大きさ・水の量をそろえる',['Aだけ水を増やす','Bだけ違う種類にする'],'調べたい光以外の条件をそろえよう。')];}
      if(k===3){title='ゴムの力で進む車';passage=`同じ車とゴムを使い、同じ床で走らせた練習記録。ゴムを3cmのばすと${a*10}cm、5cmのばすと${(a+b)*10}cm進みました。`;items=[q('この記録で、より遠くへ進んだのは？','5cmのばしたとき',['3cmのばしたとき','同じ距離'],`${(a+b)*10}cmは${a*10}cmより長い。`),q('進んだ距離の差は？',`${b*10}cm`,[`${a*10}cm`,`${(2*a+b)*10}cm`],'長い方から短い方を引く。'),q('結果を確かめるよい方法は？','同じ条件で何回か試す',['毎回、床も車も変える','1回の結果だけで決める'],'何回か試すと、結果のばらつきも分かる。')];}
      if(k===4){title='水の重さのなぞ';passage=`ふた付きの容器に水を入れると${100+a}gでした。水がこぼれないようにふたを閉め、少し傾けて形を変えてから量っても${100+a}gでした。`;items=[q('記録から分かることは？','水の形が変わっても全体の重さは同じ',['傾けると必ず重くなる','水はなくなった'],'測った数値は前後で同じ。'),q('ふたを閉めたのは何を防ぐため？','水が外へこぼれること',['水の色が青くなること','容器の重さがゼロになること'],'物が出入りすると、その分だけ全体の重さが変わる。'),q(`全体から水を${b}gだけ別の容器へ移したら、もとの全体の重さは？`,`${100+a-b}g`,[`${100+a+b}g`,`${100+a}g`],'出ていった水の重さを引く。')];}
      if(k===5){title='虫の体を見分ける';passage=`観察メモ${n}。A：頭・むね・はらに分かれ、むねにあし6本。B：あし8本。C：あしがたくさんある。あしをけがしていない成体を観察しました。`;items=[q('こん虫の体の特徴に合うのは？','A',['B','C'],'こん虫は頭・むね・はらに分かれ、あし6本がむねにつく。'),q('こん虫のあしは、体のどこにつく？','むね',['頭','はら'],'6本のあしはむねについている。'),q('「小さい生き物は全部こん虫」と言える？','言えない。体のつくりを調べる',['言える。小さければ全部こん虫','色だけで決まる'],'大きさだけでなく、体の分かれ方とあしを観察する。')];}
    }else{
      if(k===0){title='町の地図で待ち合わせ';passage=`上が北の地図です。北の列：公園・図書館・駅。南の列：家・学校・店。道はたて・横だけ。となりまで${b}分です。`;items=[q('学校から見て図書館はどちら？','北',['南','東'],'図書館は学校の上。地図の上は北。'),q('家→学校→図書館の時間は？',`${b*2}分`,[`${b}分`,`${b*3}分`],`道2本で${b}×2分。`),q('駅から学校への道案内として合うのは？','西へ図書館、そこから南へ学校',['東へ図書館、そこから北へ学校','南へ公園、そこから西へ学校'],'場所の位置を順番にたどろう。')];}
      if(k===1){title='店の売り場を調べよう';passage=`練習用の店の記録。午前は${a}人、夕方は${a+b}人のお客さん。夕方はレジを使う店員を増やしました。野菜の札には名前と産地が書かれています。`;items=[q('夕方に店員を増やした理由として合うのは？','客が多い時間の待ち時間を減らすため',['夕方は客がいないから','産地を隠すため'],'客が増える時間に会計をする人を増やす。'),q('野菜がどこでとれたか知るには？','産地の表示を見る',['レジの色を見る','かごの数を見る'],'産地は、物が作られたりとれたりした場所。'),q('この記録で、夕方は午前より何人多い？',`${b}人`,[`${a}人`,`${2*a+b}人`],'夕方の人数から午前の人数を引く。')];}
      if(k===2){title='町のバス調査';const h=9+n%6;passage=`公園前を${h}時${String(b*5).padStart(2,'0')}分に出るバスは、図書館前まで${a}分。図書館前で降りると入口まで歩いて${b}分です。`;items=[q('バスを降りて図書館へ行くときに必要な時間も入れると、出発から何分？',`${a+b}分`,[`${a}分`,`${a-b}分`],'バスの時間と、降りてから歩く時間を足す。'),q('バス停の時刻表から分かるのは？','そのバス停を出る予定の時こく',['すべての乗客の名前','必ず渋滞しないこと'],'時刻表は予定。道路の状況で遅れることもある。'),q('道路工事でバス停が変わるとき、確かめる情報は？','バス会社の案内や停留所のお知らせ',['昨日見た車の色','図書館の本の表紙'],'運行を担当するところの新しい案内を確認する。')];}
      if(k===3){title='ごみを減らす調査隊';passage=`学校の練習記録です。紙ごみは先週${a+b}袋、今週${a}袋。今週は裏紙をメモに使いました。分け方は地域の決まりに従っています。`;items=[q('紙ごみは何袋減った？',`${b}袋`,[`${a}袋`,`${2*a+b}袋`],'先週の袋数から今週を引く。'),q('まだ使える紙の裏をメモに使うのは？','捨てる前にもう一度使う工夫',['ごみを道路に置く工夫','新しい紙を多く捨てる工夫'],'使えるものを再び使うと、ごみを減らせる。'),q('初めての物を捨てるとき、分け方は何で確かめる？','住んでいる地域の案内',['色だけで決める','全国どこでも同じだと決める'],'回収方法は地域で異なるので、地域の案内を確認する。')];}
      if(k===4){title='昔と今の町の記録';passage=`練習用の町の資料。昔の地図では畑${a}区画・住宅${b}区画。今の地図では畑${a-b}区画・住宅${2*b}区画。写真には新しい道路も写っています。`;items=[q('この資料から言える変化は？','畑が減り、住宅が増えた',['畑も住宅も増えた','畑が増え、住宅が減った'],'地図に書かれた数をそれぞれくらべる。'),q('変化の理由をもっと知りたいときは？','昔を知る人や町の資料で調べる',['地図の色だけで理由を決める','想像した理由を事実にする'],'資料から分かる変化と、その理由は分けて確かめる。'),q('住宅の区画は、いくつ増えた？',`${b}区画`,[`${2*b}区画`,`${3*b}区画`],'今の数から昔の数を引く。')];}
      if(k===5){title='安全な通学路を考える';passage=`通学路Aは${a}分で、信号のない大きな道路を渡ります。Bは${a+b}分で、歩道と信号のある横断歩道を通ります。どちらも歩いて調べた練習記録です。`;items=[q('時間だけでなく、道を選ぶときに見るのは？','歩道や横断歩道などの安全',['店の看板の好きな色だけ','いつも一番短い時間だけ'],'安全に通れるか、家族や学校と確認する。'),q('BはAより何分長い？',`${b}分`,[`${a}分`,`${a+b}分`],'Bの時間からAの時間を引く。'),q('信号が青になっても必要なことは？','左右を見て車が止まったことを確かめる',['周りを見ず走る','画面を見たまま歩く'],'信号だけでなく、実際の車や周りを確かめる。')];}
    }
    return {id:subject==='理科'?'science':'social',week:1,subject,title:stamp+' '+title,time:'5〜10分',level:'小3・考える調査',passage,mission:'記録を手がかりに、答えを選ぼう。',source:'オリジナルの練習資料。週ごとに題材を巡り、数値や条件を変える出題ルール v1。',questions:items.map((q,i)=>Object.assign(q,{id:'q'+(i+1)}))};
  }
  function weekly(now){const last=monday(now),out=[];for(let t=Date.parse(START+'T00:00:00Z'),i=0;t<=Date.parse(last+'T00:00:00Z');t+=7*DAY,i++){const stamp=new Date(t).toISOString().slice(0,10);out.push({format:'rihoko-lesson-pack',version:1,id:'weekly-v1-'+stamp,revision:1,title:stamp+'の週の調査',description:'毎週月曜に理科と社会が1セットずつ追加されます。前の週も復習できます。',lessons:['理科','社会'].map(s=>lesson(s,i,stamp))});}return out.reverse();}
  const api={choice,numbers,review,weekly,monday,start:START,titles};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AdaptiveLessons=api;
})(typeof window!=='undefined'?window:globalThis);
