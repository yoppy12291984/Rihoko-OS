/* WebRTC音声接続。開始・終了の競合で古いマイクや会話を残さない。 */
(function () {
  'use strict';
  let active = null;
  function stop() {
    const s = active; active = null;
    if (!s) return;
    clearTimeout(s.timer); clearTimeout(s.connectTimer); clearTimeout(s.replyTimer); s.abort.abort();
    if (s.dc) { s.dc.onopen = s.dc.onmessage = s.dc.onclose = null; s.dc.close(); }
    if (s.pc) { s.pc.ontrack = s.pc.oniceconnectionstatechange = null; s.pc.close(); }
    if (s.stream) s.stream.getTracks().forEach(t => t.stop());
    const audio = document.getElementById('soraAudio');
    if (audio) { audio.pause(); audio.srcObject = null; }
  }
  async function start(options) {
    stop();
    const s = {abort:new AbortController(), items:new Map(), order:[], pending:new Set(), turn:'connecting', options};
    active = s;
    const live = () => active === s;
    const status = text => { if (live()) options.onStatus(text); };
    const fail = error => { if (live()) { stop(); options.onError(error); } };
    s.setTurn = turn => { if(live()) { s.turn=turn; if(options.onTurn)options.onTurn(turn); } };
    s.fail = fail;
    s.ready = () => { clearTimeout(s.replyTimer); s.setTurn('ready'); status('「話しはじめる」を押してね。'); };
    const emit = () => {
      if (live()) options.onMessages(s.order.map(id => s.items.get(id)).filter(x => x && x.text));
    };
    function item(id, role, previous) {
      if (!s.items.has(id)) {
        s.items.set(id, {id,role,text:''});
        const index = s.order.indexOf(previous);
        if (index >= 0) s.order.splice(index + 1, 0, id); else s.order.push(id);
      }
      return s.items.get(id);
    }
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('このブラウザーではマイクを使えません。Safariで開いてね。');
      status('マイクを準備しています…');
      let stream;
      const constraints = {echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1};
      if (options.deviceId) constraints.deviceId = {exact:options.deviceId};
      try { stream = await navigator.mediaDevices.getUserMedia({audio:constraints}); }
      catch (err) {
        if (err.name === 'OverconstrainedError' && !options.deviceId) stream = await navigator.mediaDevices.getUserMedia({audio:true});
        else throw err;
      }
      if (!live()) { stream.getTracks().forEach(t => t.stop()); return; }
      s.stream = stream;
      const track = stream.getAudioTracks()[0];
      track.enabled = false;
      options.onDevice(track.label || '端末が選んだマイク');
      status('音声AIにつないでいます…');
      s.connectTimer = setTimeout(() => fail(new Error('接続に時間がかかっています。通信を確認してもう一度ためしてね。')),45000);
      const token = await FamilyAuth.request({action:'token',persona:options.persona,audioMode:options.audioMode});
      if (!live()) return;
      if (!token.value) throw new Error('音声AIの準備ができませんでした。');
      const pc = s.pc = new RTCPeerConnection();
      const audio = document.getElementById('soraAudio');
      audio.autoplay = true; audio.playsInline = true; audio.volume = options.audioMode === 'headphones' ? 1 : 0.75;
      pc.ontrack = event => {
        if (!live()) return;
        audio.srcObject = event.streams[0];
        audio.play().catch(() => fail(new Error('音声を再生できませんでした。もう一度「話す」を押してね。')));
      };
      pc.oniceconnectionstatechange = () => {
        if (!live()) return;
        clearTimeout(s.timer);
        const lost = () => fail(new Error('接続が切れました。話した内容は残っています。もう一度つないでね。'));
        if (pc.iceConnectionState === 'disconnected') s.timer = setTimeout(lost,8000);
        else if (['failed','closed'].includes(pc.iceConnectionState)) lost();
      };
      stream.getTracks().forEach(t => pc.addTrack(t,stream));
      const dc = s.dc = pc.createDataChannel('oai-events');
      dc.onopen = () => {
        if (!live()) return;
        status('ボタンで話す準備をしています…');
        dc.send(JSON.stringify({type:'session.update',session:{type:'realtime',audio:{input:{turn_detection:null}}}}));
      };
      dc.onclose = () => fail(new Error('音声の接続が終わりました。もう一度つないでね。'));
      dc.onmessage = event => {
        if (!live()) return;
        let e; try { e = JSON.parse(event.data); } catch (_) { return; }
        if(e.type==='session.updated' && s.turn==='connecting' && e.session && e.session.audio && e.session.audio.input && e.session.audio.input.turn_detection===null){
          clearTimeout(s.connectTimer); options.onReady(); s.ready();
        }
        if(e.type==='input_audio_buffer.committed'){
          s.pending.delete('commit'); s.pending.add(e.item_id);
          if(s.wantReply){s.wantReply=false; dc.send(JSON.stringify({type:'response.create'}));}
        }
        if (e.type === 'conversation.item.created' || e.type === 'conversation.item.added') {
          if (e.item && ['user','assistant'].includes(e.item.role)) item(e.item.id,e.item.role,e.previous_item_id);
        }
        if (e.type === 'conversation.item.input_audio_transcription.delta') {
          item(e.item_id,'user').text += e.delta || ''; emit();
        }
        if (e.type === 'conversation.item.input_audio_transcription.completed') {
          item(e.item_id,'user').text = e.transcript || ''; s.pending.delete(e.item_id); emit();
        }
        if (e.type === 'conversation.item.input_audio_transcription.failed') {
          s.pending.delete(e.item_id); options.onNotice('聞き取りができなかった部分があります。もう一度話すか、文字で直してね。');
        }
        if (e.type === 'response.output_audio_transcript.delta') { item(e.item_id,'assistant').text += e.delta || ''; emit(); }
        if (e.type === 'response.output_audio_transcript.done') { item(e.item_id,'assistant').text = e.transcript || ''; emit(); }
        if (e.type === 'output_audio_buffer.started') {s.setTurn('replying'); status('AIの番だよ。聞いてね。');}
        if (e.type === 'output_audio_buffer.stopped' && s.turn==='replying') s.ready();
        if(e.type==='response.done'){
          const r=e.response||{};
          const hasAudio=(r.output||[]).some(x=>(x.content||[]).some(c=>c.type==='audio'||c.type==='output_audio'));
          if(r.status==='failed'||r.status==='incomplete'){options.onNotice('返事を最後まで受け取れませんでした。もう一度話してね。');s.ready();}
          else if(!hasAudio && s.turn==='replying')s.ready();
        }
        if (e.type === 'error') fail(new Error('音声AIでエラーが起きました。もう一度つないでね。'));
      };
      const offer = await pc.createOffer(); if (!live()) return;
      await pc.setLocalDescription(offer); if (!live()) return;
      const response = await fetch('https://api.openai.com/v1/realtime/calls', {
        method:'POST',headers:{Authorization:'Bearer '+token.value,'Content-Type':'application/sdp'},body:offer.sdp,signal:s.abort.signal
      });
      if (!response.ok) throw new Error('音声AIにつながりませんでした（'+response.status+'）。');
      const answer = await response.text(); if (!live()) return;
      await pc.setRemoteDescription({type:'answer',sdp:answer});
    } catch (err) {
      if (err.name === 'NotAllowedError') err = new Error('マイクを使う許可が必要です。iPhoneのSafari設定を確認してね。');
      if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') err = new Error('選んだマイクが見つかりません。「端末におまかせ」でつなぎ直してね。');
      fail(err);
    }
  }
  function beginTurn(){
    const s=active;if(!s||s.turn!=='ready'||s.dc.readyState!=='open')return;
    s.dc.send(JSON.stringify({type:'input_audio_buffer.clear'}));
    s.startedAt=Date.now();s.stream.getAudioTracks().forEach(t=>{t.enabled=true;});
    s.setTurn('recording');s.options.onStatus('聞いているよ。話し終わったら「話し終わった・送る」を押してね。');
  }
  function commitTurn(reply){
    const s=active;if(!s||s.turn!=='recording')return false;
    if(Date.now()-s.startedAt<300){s.options.onNotice('少し話してから「話し終わった・送る」を押してね。');return false;}
    s.stream.getAudioTracks().forEach(t=>{t.enabled=false;});
    s.wantReply=reply;s.pending.add('commit');s.setTurn(reply?'replying':'finishing');
    s.options.onStatus(reply?'送ったよ。AIの返事を待っています…':'最後の言葉を受け取っています…');
    s.dc.send(JSON.stringify({type:'input_audio_buffer.commit'}));
    if(reply)s.replyTimer=setTimeout(()=>s.fail(new Error('返事に時間がかかっています。もう一度つないでね。')),60000);
    return true;
  }
  async function finish() {
    const s = active;
    if (!s) return;
    if (s.stream) s.stream.getAudioTracks().forEach(t => { t.enabled = false; });
    if(s.turn==='recording')commitTurn(false);
    s.wantReply=false;
    const until = Date.now()+5000;
    while (active === s && s.pending.size && Date.now()<until) await new Promise(resolve => setTimeout(resolve,100));
    if (active === s) {
      if(s.pending.size)s.options.onNotice('最後の言葉を受け取りきれませんでした。日記にする前に文字で足してね。');
      stop();
    }
  }
  window.VoiceSession = {start,stop,finish,beginTurn,sendTurn:()=>commitTurn(true)};
})();
