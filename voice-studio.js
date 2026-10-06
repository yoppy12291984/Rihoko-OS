/* 会話画面と、本人が確認して保存する端末内の日記。 */
(function () {
  'use strict';
  const KEY = 'rihoko-kumi-diaries-v1';
  const states = {};
  let root = null, persona = null;
  const esc = value => String(value || '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today = () => { const d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  function initial() { return {phase:'idle',turn:'connecting',status:'つないでから「話しはじめる」を押してね。',mode:'speaker',deviceId:'',devices:[],device:'',messages:[],source:'',draft:null,busy:false,notice:'',summary:'',session:0,date:today()}; }
  function diaries() {
    const value = window.KeepsakeSync ? KeepsakeSync.read('diaries') : JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(value)) throw new Error('保存した日記を読み込めませんでした。');
    return value;
  }
  function draw() {
    if (!root || !persona) return;
    const s = states[persona], kumi = persona === 'kumi', name = kumi ? 'Kumi' : 'Sola';
    const active = s.phase !== 'idle';
    root.innerHTML = '<section class="voice-studio '+(kumi?'voice-kumi':'')+'"><header><span class="voice-badge">'+(kumi?'きょうの日記':'えいごの友だち')+'</span><h2>'+name+'とおはなし</h2><p>'+(kumi?'今日あったことを、日本語で聞かせてね。':'好きなことを、ひとことずつ話そう。日本語でも大丈夫。')+'</p></header>'+
      '<div class="voice-card"><label>音の出し方<select id="voiceMode" '+(active?'disabled':'')+'><option value="speaker" '+(s.mode==='speaker'?'selected':'')+'>iPhone・iPadのスピーカー</option><option value="headphones" '+(s.mode==='headphones'?'selected':'')+'>AirPods・イヤホン</option></select></label>'+
      '<p class="voice-help">'+(s.mode==='headphones'?'先にAirPodsをiPhoneへ接続してね。音が本体から出るときは、コントロールセンターで出力先をAirPodsにしてから話そう。':'静かな場所で、マイクの近くから話してね。考える時間も待つよ。')+'</p>'+
      (s.devices.length?'<label>使うマイク<select id="voiceMic" '+(active?'disabled':'')+'><option value="">端末におまかせ</option>'+s.devices.map(d=>'<option value="'+esc(d.deviceId)+'" '+(s.deviceId===d.deviceId?'selected':'')+'>'+esc(d.label)+'</option>').join('')+'</select></label>':'')+
      (s.device?'<p class="voice-help">マイク：'+esc(s.device)+'</p>':'')+
      '<p class="voice-help">① 話しはじめる → ② 話し終わった・送る → ③ '+name+'の返事。ボタンを押すまで、AIは話しはじめません。</p>'+
      (s.phase==='talking'?'<button class="voice-primary '+(s.turn==='recording'?'voice-recording':'')+'" id="voiceTurn" '+(!['ready','recording'].includes(s.turn)?'disabled':'')+'>'+(s.turn==='recording'?'話し終わった・送る':s.turn==='ready'?'🎤 話しはじめる':name+'の返事を聞いてね…')+'</button>':'')+
      '<button class="'+(active?'voice-secondary':'voice-primary')+'" id="voiceToggle" '+(s.busy||s.phase==='finishing'?'disabled':'')+'>'+(s.phase==='finishing'?'最後の言葉を受け取っています…':active?'会話をおわる':name+'につなぐ')+'</button>'+
      '<p id="voiceStatus" class="voice-status" role="status">'+esc(s.status)+'</p><p id="voiceNotice" class="voice-notice" role="alert">'+esc(s.notice)+'</p></div>'+
      '<div class="voice-card"><h3>話したこと</h3><p class="voice-help">聞き取りが違っていたら、もう一度ゆっくり話してね。</p><div id="voiceMessages" class="voice-messages" aria-label="会話の文字"></div></div>'+
      (kumi?diaryEditor(s,active):s.summary?'<div class="voice-card">'+esc(s.summary)+'</div>':'')+
      (kumi?diaryList():'')+'</section>';
    root.querySelector('#voiceMode').onchange = e => { s.mode=e.target.value; draw(); };
    const mic=root.querySelector('#voiceMic'); if(mic) mic.onchange=e=>{s.deviceId=e.target.value;};
    root.querySelector('#voiceToggle').onclick = () => active ? end(persona,true) : begin(persona);
    const turnButton=root.querySelector('#voiceTurn');if(turnButton)turnButton.onclick=()=>{s.notice='';if(s.turn==='recording')VoiceSession.sendTurn();else VoiceSession.beginTurn();};
    paintMessages();
    if (kumi) bindDiary(s);
  }
  function paintMessages() {
    if (!root || !persona) return;
    const s=states[persona], box=root.querySelector('#voiceMessages');
    if (!box) return;
    const atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<60;
    box.innerHTML=s.messages.length?s.messages.map(m=>'<div class="voice-line '+(m.role==='user'?'voice-child':'')+'"><b>'+esc(m.role==='user'?'里穂子':persona==='kumi'?'Kumi':'Sola')+'</b><p>'+esc(m.text)+'</p></div>').join(''):'<p class="voice-help">ここに里穂子と'+(persona==='kumi'?'Kumi':'Sola')+'の言葉が出るよ。</p>';
    if(atBottom) box.scrollTop=box.scrollHeight;
  }
  function status(p,text) {
    states[p].status=text;
    if(root&&persona===p) {const el=root.querySelector('#voiceStatus');if(el) el.textContent=text;}
  }
  async function begin(p) {
    const s=states[p];
    if(s.phase!=='idle'||s.busy) return;
    s.phase='connecting';s.turn='connecting';s.notice='';s.session++;
    const session=s.session, prior=s.messages.slice();
    draw();
    await VoiceSession.start({persona:p,audioMode:s.mode,deviceId:s.deviceId,
      onStatus:text=>status(p,text),
      onReady:()=>{s.phase='talking'; if(persona===p)draw();},
      onTurn:turn=>{if(s.session!==session)return;s.turn=turn;if(persona===p)draw();},
      onDevice:label=>{
        s.device=label;
        navigator.mediaDevices.enumerateDevices().then(all=>{
          s.devices=all.filter(d=>d.kind==='audioinput'&&d.deviceId&&d.label).map(d=>({deviceId:d.deviceId,label:d.label}));
          if(persona===p) draw();
        }).catch(()=>{});
      },
      onMessages:messages=>{
        if(s.session!==session)return;
        s.messages=prior.concat(messages.map(m=>({...m,id:session+':'+m.id})));
        if(persona===p)paintMessages();
      },
      onNotice:text=>{s.notice=text;if(persona===p)draw();},
      onError:err=>{s.phase='idle';s.notice=err.message;collectSource(p);status(p,'話したことは画面に残っています。');if(persona===p)draw();}
    });
  }
  function collectSource(p) {
    const s=states[p];
    // 編集済みの文章を消さず、まだ取り込んでいない本人の発言だけを追加。
    if(!s.collected)s.collected=new Set();
    const fresh=s.messages.filter(m=>m.role==='user'&&!s.collected.has(m.id));
    fresh.forEach(m=>s.collected.add(m.id));
    if(fresh.length)s.source=[s.source,...fresh.map(m=>m.text)].filter(Boolean).join('\n');
  }
  async function end(p,grace) {
    const s=states[p];if(!s||s.phase==='idle'||s.phase==='finishing')return;
    const connected=s.phase==='talking'; s.phase='finishing';if(persona===p)draw();
    if(grace&&connected)await VoiceSession.finish();else VoiceSession.stop();
    s.phase='idle';collectSource(p);status(p,p==='kumi'?'話したことをたしかめて、日記にしよう。':'お話ししたね。また話そう。');
    if(persona===p)draw();
    if(p==='sola'&&s.messages.some(m=>m.role==='user')&&!s.busy){
      s.busy=true;if(persona===p)draw();
      try {
        const transcript=s.messages.map(m=>(m.role==='user'?'里穂子':'Sola')+': '+m.text).join('\n');
        const result=await FamilyAuth.request({action:'log',transcript});
        s.summary=result.summary&&result.summary.comment||'';
        if(result.summary&&(result.summary.error||result.summary._saveError))s.notice='会話は終了しましたが、学習記録を保存できませんでした。';
      }catch(_){s.notice='会話は終了しましたが、学習記録を保存できませんでした。';}
      finally{s.busy=false;if(persona===p)draw();}
    }
  }
  function diaryEditor(s,active) {
    return '<div class="voice-card"><h3>日記にする</h3><label>話したことをたしかめよう<textarea id="diarySource" rows="5" maxlength="8000" '+(active||s.busy?'disabled':'')+' placeholder="文字で書き足してもいいよ">'+esc(s.source)+'</textarea></label>'+
      '<button id="diaryDraft" class="voice-secondary" '+(active||s.busy?'disabled':'')+'>'+(s.busy?'下書きを作っています…':'この内容で下書きを作る')+'</button>'+
      '<p class="voice-help">音声と下書きづくりにはAIを使います。「確認して保存」した日記をご家族の端末と共有します。未保存の下書きは共有しません。</p>'+
      (s.draft?'<div class="diary-review"><h3>読んで、直して、保存しよう</h3><label>日付<input id="diaryDate" type="date" value="'+esc(s.date)+'"></label><label>題名<input id="diaryTitle" maxlength="100" value="'+esc(s.draft.title)+'"></label><label>日記<textarea id="diaryBody" rows="7" maxlength="8000">'+esc(s.draft.body)+'</textarea></label><button id="diarySave" class="voice-primary" '+(active||s.busy?'disabled':'')+'>確認して保存</button></div>':'')+'</div>';
  }
  function diaryList() {
    try {
      const list=diaries();
      return '<div class="voice-card"><h3>保存した日記</h3><p class="voice-help">共有済みの日記は別の端末でも読めます。大切な日記は「ファイルに保存」でも残せるよ。</p>'+(!list.length?'<p>まだ日記はないよ。</p>':list.slice().reverse().map(d=>'<details><summary>'+esc(d.date)+'　'+esc(d.title)+'</summary><p class="diary-text">'+esc(d.body)+'</p><button class="voice-secondary" data-diary-export="'+esc(d.id)+'">ファイルに保存</button></details>').join(''))+'</div>';
    } catch(_){return '<p class="voice-notice">保存した日記を読み込めません。ブラウザーの保存設定を確認してね。</p>';}
  }
  function bindDiary(s) {
    root.querySelector('#diarySource').oninput=e=>{s.source=e.target.value;};
    root.querySelector('#diaryDraft').onclick=async()=>{
      if(!s.source.trim()){s.notice='話したことを入れてから押してね。';draw();return;}
      s.busy=true;s.notice='';draw();
      try {
        const result=await FamilyAuth.request({action:'diaryDraft',transcript:s.source});
        if(!result.draft||!result.draft.body)throw new Error('下書きを作れませんでした。');
        s.draft=result.draft;s.savedId=null;status('kumi','まだ保存していません。読んで、合っているかたしかめてね。');
      }catch(e){s.notice=e.name==='AbortError'?'時間がかかっています。少し待ってからもう一度ためしてね。':e.message;}
      finally{s.busy=false;if(persona==='kumi')draw();}
    };
    if(s.draft){
      root.querySelector('#diaryDate').oninput=e=>{s.date=e.target.value;};
      root.querySelector('#diaryTitle').oninput=e=>{s.draft.title=e.target.value;};
      root.querySelector('#diaryBody').oninput=e=>{s.draft.body=e.target.value;};
      root.querySelector('#diarySave').onclick=()=>{
        if(!s.date||!s.draft.title.trim()||!s.draft.body.trim()){s.notice='日付・題名・日記を入れてね。';draw();return;}
        try{
          const list=diaries(), id=s.savedId||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
          const entry={id,date:s.date,title:s.draft.title.trim(),body:s.draft.body.trim()};
          const index=list.findIndex(d=>d.id===id);if(index<0)list.push(entry);else list[index]=entry;
          if(window.KeepsakeSync)KeepsakeSync.save('diaries',entry);else localStorage.setItem(KEY,JSON.stringify(list));s.savedId=id;s.notice='';status('kumi','日記を保存したよ。共有状況は画面の上で確認できるよ。');
        }catch(_){s.notice='保存できませんでした。本文をコピーして残してね。ブラウザーの空き容量や保存設定を確認してください。';}
        draw();
      };
    }
    root.querySelectorAll('[data-diary-export]').forEach(button=>button.onclick=()=>{
      const entry=diaries().find(d=>d.id===button.dataset.diaryExport);if(!entry)return;
      const url=URL.createObjectURL(new Blob([entry.date+'\n'+entry.title+'\n\n'+entry.body],{type:'text/plain;charset=utf-8'}));
      const a=document.createElement('a');a.href=url;a.download='Kumi-'+entry.date+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
  }
  function mount(element,p) {
    if(persona&&persona!==p&&states[persona].phase!=='idle')end(persona,false);
    root=element;persona=p;
    if(!p||!element)return;
    if(!states[p])states[p]=initial();
    draw();
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&persona)end(persona,false);});
  window.addEventListener('pagehide',()=>VoiceSession.stop());
  // 入力中の本文はstatesに保持されるため、共有履歴を更新しても下書きを失わない。
  window.addEventListener('keepsakes-updated',()=>{if(root&&persona==='kumi')draw();});
  window.VoiceStudio={mount};
})();
