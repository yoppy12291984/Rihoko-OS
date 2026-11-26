/* Local, snapshot-based practice. Published questions are never rewritten. */
(function(root){
  'use strict';
  const C=typeof module!=='undefined'&&module.exports?require('./weekly-curriculum.js'):root.WeeklyCurriculum;
  const A=typeof module!=='undefined'&&module.exports?require('./adaptive-lessons.js'):root.AdaptiveLessons;
  function rules(){return A||root.AdaptiveLessons;}
  const subjects=['理科','社会'];
  function rows(subject){return subject==='理科'?C.science:C.social;}
  function guides(subject){return typeof module!=='undefined'&&module.exports?require(subject==='理科'?'./science-guides.js':'./social-guides.js'):(subject==='理科'?root.ScienceGuides:root.SocialGuides);}
  function preferences(raw){
    const out={};raw=raw||{};
    for(const subject of subjects){const p=raw[subject]||{};const level=p.level===undefined?'auto':p.level,focus=p.focus||'balanced',topic=p.topic||'auto';
      if(!['auto','1','2','3'].includes(level)||!['balanced','review','new'].includes(focus)||topic!=='auto'&&!rows(subject).some(r=>r[0]===topic))throw Error('学習の設定を確認してください。');
      out[subject]={level,focus,topic,paused:p.paused===true};
    }return out;
  }
  function topicFor(subject,q,fallback){
    if(!subjects.includes(subject))return fallback||'';
    if(q.studyTitle&&rows(subject).some(r=>r[0]===q.studyTitle))return q.studyTitle;
    const prompt=q.question||q.prompt||'';
    const row=rows(subject).find(r=>prompt.includes(r[1])||prompt.includes(r[6]));if(row)return row[0];
    if(rows(subject).some(r=>r[0]===fallback))return fallback;
    const aliases={'氷がとけたのはなぜ？':'水・氷・水蒸気','磁石の調査メモ':'磁石の極','町の地図で待ち合わせ':'地図の方位','店の売り場を調べよう':'店の品ぞろえ'};
    if((fallback||'').includes('日なたと日かげの温度調査'))return '晴れの日の気温';
    return aliases[fallback]||aliases[(fallback||'').replace(/^\d{4}-\d{2}-\d{2}\s+/,'')]||fallback||'';
  }
  function evidence(packs,responses,subject){
    const latest=new Map();
    for(const p of packs)for(const l of p.lessons){if(l.subject!==subject)continue;for(const q of l.questions){
      const r=responses[[p.id,p.revision,l.id,q.id].join('/')];if(!r)continue;
      const topic=topicFor(subject,q,l.title);if(!rows(subject).some(row=>row[0]===topic))continue;
      const row=rows(subject).find(row=>row[0]===topic),prompt=q.question||'';
      const variant=q.studyKey||(prompt.includes(row[1])?'basic':prompt.includes(row[6])?'method':prompt);
      const first=r.firstAttempt,check=first||r.check;
      if(!check&&!['again','unlearned'].includes(r.rating))continue;
      const trusted=!!first&&first.knownInitial!==false;
      const item={topic,key:variant,at:first?.checkedAt||check?.checkedAt||r.updatedAt||'',independent:trusted&&first.result==='correct'&&!first.assisted,needsHelp:!check||check.result!=='correct'||!!first?.assisted||!first&&(r.hintUsed||r.answerSeen),trusted:trusted};
      const key=topic+'/'+variant,old=latest.get(key);if(!old||old.at<=item.at)latest.set(key,item);
    }}return Array.from(latest.values()).sort((a,b)=>a.at.localeCompare(b.at));
  }
  function levelFor(items){const recent=items.filter(x=>x.trusted).slice(-8),correct=recent.filter(x=>x.independent).length;if(recent.length>=6&&correct/recent.length>=.8)return 3;if(recent.length>=3&&correct/recent.length>=.6)return 2;return 1;}
  function summary(packs,responses,subject,raw){const prefs=preferences(raw)[subject],items=evidence(packs,responses,subject);return {subject,level:prefs.level==='auto'?levelFor(items):Number(prefs.level),checked:items.filter(x=>x.trusted).length,independent:items.filter(x=>x.independent).length,needsHelp:items.filter(x=>x.needsHelp).length,seen:new Set(items.map(x=>x.topic)).size,items,prefs};}
  function targetLevel(info,topic){const own=info.items.filter(x=>x.topic===topic);return info.prefs.level!=='auto'?Number(info.prefs.level):!own.length?1:own.filter(x=>x.independent).length>=2&&!own.some(x=>x.needsHelp)?Math.max(2,info.level):own.some(x=>x.needsHelp)?1:info.level;}
  function chooseTopics(info,previous){
    const all=rows(info.subject).map(r=>r[0]);if(info.prefs.topic!=='auto')return Array(targetLevel(info,info.prefs.topic)===3?3:2).fill(info.prefs.topic);
    const byTopic=t=>info.items.filter(x=>x.topic===t),old=t=>{const xs=byTopic(t);return xs.length?xs[xs.length-1].at:'';};
    const stable=all.slice().sort((a,b)=>previous.lastIndexOf(a)-previous.lastIndexOf(b)||old(a).localeCompare(old(b))||all.indexOf(a)-all.indexOf(b));
    const weak=stable.filter(t=>byTopic(t).some(x=>x.needsHelp)),fresh=stable.filter(t=>!byTopic(t).length),seen=stable.filter(t=>byTopic(t).length);
    let order=info.prefs.focus==='review'?[...weak,...seen,...fresh]:info.prefs.focus==='new'?[...fresh,...weak,...seen]:[...weak.slice(0,1),...fresh.slice(0,1),...stable];
    return Array.from(new Set(order)).slice(0,3);
  }
  function build(packs,responses,raw,now,serial){
    if(!Number.isSafeInteger(serial)||serial<1)throw Error('練習番号を確認してください。');
    const prefs=preferences(raw),stamp=rules().monday(now),lessons=[];
    for(const subject of subjects){if(prefs[subject].paused)continue;
      const info=summary(packs,responses,subject,prefs),previous=packs.filter(p=>p.id.startsWith('growth-v1-')).flatMap(p=>p.lessons.filter(l=>l.subject===subject).flatMap(l=>l.questions.map(q=>q.studyTitle)));
      const topics=chooseTopics(info,previous),bank=guides(subject);if(!Array.isArray(bank)||bank.length!==52)throw Error('解説を読み込めませんでした。');
      const questions=topics.map((topic,i)=>{
        const row=rows(subject).find(r=>r[0]===topic),g=bank.find(g=>g.title===topic);if(!g)throw Error('テーマの解説が見つかりません。');
        const own=info.items.filter(x=>x.topic===topic),forced=prefs[subject].level!=='auto';
        const level=targetLevel(info,topic);
        let kind=level===3?'challenge':level===2?'method':'basic';
        const weak=own.filter(x=>x.needsHelp&&['basic','method','challenge'].includes(x.key));
        if(!forced&&own.some(x=>x.independent&&x.key==='basic')&&weak.length)kind=weak[0].key;
        if(prefs[subject].topic!=='auto')kind=['basic','method',level===1?'basic':'challenge'][i];
        // A chosen topic gets two basic questions before a reasoning question; no fabricated facts.
        if(prefs[subject].topic!=='auto'&&level===1&&i===2)kind='method';
        const offset=kind==='basic'?1:6,source=kind==='challenge'?g.challenge:{question:row[offset],answer:row[offset+1],choices:row.slice(offset+1,offset+4),explanation:row[offset+4]};
        const q=rules().choice(source.question,source.answer,source.choices.filter(c=>c!==source.answer),source.explanation,stamp+'/'+serial+'/'+subject+'/'+i);
        return {...q,id:'q'+(i+1),studyTitle:topic,studyLevel:level,studyKey:kind,hint:level===1?'「先に学ぼう」を開いて、しくみや言葉を知ってから選んでいいよ。':g.steps[0]};
      });
      lessons.push({id:subject==='理科'?'science':'social',week:1,subject,title:subject+' · じぶんに合う調査 '+serial,level:'基礎から・たしかめる・考えを深める',time:'5〜10分',mission:'知らないことは「先に学ぼう」で読んでから。わかったことを少しずつ増やそう。',source:'解答記録に合わせて確認済みの問題から構成。学力の目安は初回解答と補助の利用から計算。',questions});
    }
    if(!lessons.length)throw Error('理科と社会が両方お休み中です。設定で一つ以上を再開してください。');
    return {format:'rihoko-lesson-pack',version:1,id:'growth-v1-'+stamp+'-'+serial,revision:1,title:stamp+'の週 · じぶんに合う練習 '+serial,description:'学び直しと次の一歩を組み合わせた練習。出題後の内容は変わらず、復習に残ります。',lessons};
  }
  const api={subjects,rows,preferences,topicFor,evidence,levelFor,summary,build};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ContinuingLearning=api;
})(typeof window!=='undefined'?window:globalThis);
