/* Rihoko用アダプター。登録済み端末は先に開き、確認は裏側で行う。 */
(function(){
  'use strict';
  var key='riho-family-device',pendingKey='riho-family-login-pending',startApp,started=false,core;
  var $=function(id){return document.getElementById(id);};
  function message(text){$('familyAuthMessage').textContent=text;}
  async function raw(payload){
    var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},['worksheet','diaryDraft','log'].includes(payload.action)?120000:30000);
    try{
      var res=await fetch(SORA_TOKEN_ENDPOINT,{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),signal:controller.signal});
      if(!res.ok)throw new Error('通信できませんでした');return await res.json();
    }finally{clearTimeout(timer);}
  }
  function lock(){
    document.documentElement.classList.remove('family-authorized');$('app').inert=true;$('familyAuthGate').hidden=false;
    $('keepsakeSharing').hidden=true;$('familyLogout').hidden=true;
    if(window.VoiceSession)VoiceSession.stop();
    message('このアプリを使う最初の一回だけ、家族の招待コードを入れてください。');
  }
  function open(){
    document.documentElement.classList.add('family-authorized');$('app').inert=false;$('familyAuthGate').hidden=true;$('keepsakeSharing').hidden=false;
    if(!started){started=true;startApp();}else location.reload();
  }
  function persistHint(){if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(function(){});}
  function probeStorage(){var p=key+'-probe';localStorage.setItem(p,'1');localStorage.removeItem(p);}
  async function pair(){
    var btn=$('familyPair');btn.disabled=true;
    try{
      probeStorage();message('このアプリを登録しています…');
      var invite=$('familyInvite').value.replace(/[\s-]/g,'').toUpperCase();
      var pending=JSON.parse(localStorage.getItem(key+'-pending-registration')||'null');
      if(!pending||pending.invite!==invite){pending={invite:invite,session:base64(crypto.getRandomValues(new Uint8Array(32)))};localStorage.setItem(key+'-pending-registration',JSON.stringify(pending));}
      var check=await raw({action:'authCheck',familySession:pending.session});
      var result=check.authenticated?{session:pending.session,device:true,manager:check.manager}:await raw({action:'authRedeemInvite',invite:invite,deviceToken:pending.session,name:$('familyDeviceName').value||'家族のアプリ'});
      if(result.error)throw new Error('登録できませんでした。コードを確認して、もう一度お試しください。');
      core.remember(result);localStorage.removeItem(key+'-pending-registration');persistHint();open();
    }catch(e){message(e.name==='AbortError'?'通信に時間がかかっています。接続を確認して再試行してください。':e.message);}
    finally{btn.disabled=false;}
  }
  function base64(bytes){return btoa(String.fromCharCode.apply(null,new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  async function google(){
    $('familyLogin').disabled=true;
    try{
      probeStorage();var verifier=base64(crypto.getRandomValues(new Uint8Array(32)));
      var challenge=base64(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
      var reply=await raw({action:'authStart',challenge:challenge,returnToApp:true});
      if(reply.error||!reply.url)throw new Error('初期設定につなげませんでした');
      var url=new URL(reply.url);if(url.origin!=='https://accounts.google.com')throw new Error('戻り先が不正です');
      localStorage.setItem(pendingKey,JSON.stringify({verifier:verifier,state:url.searchParams.get('state'),expires:Date.now()+600000}));location.assign(url.href);
    }catch(e){message(e.message);$('familyLogin').disabled=false;}
  }
  async function callback(){
    var q=new URLSearchParams(location.search);if(!q.has('state'))return false;
    var pending=JSON.parse(localStorage.getItem(pendingKey)||'null');
    history.replaceState(null,'',location.pathname);localStorage.removeItem(pendingKey);
    if(!pending||pending.expires<Date.now()||pending.state!==q.get('state'))throw new Error('初期設定を開始した画面から、もう一度操作してください。');
    var session=await raw({action:'authComplete',state:q.get('state'),code:q.get('code'),error:q.get('error'),verifier:pending.verifier});
    if(session.error)throw new Error('管理者の確認ができませんでした');
    var device=await raw({action:'authRemember',familySession:session.session,name:$('familyDeviceName').value||'保護者の管理端末'});
    if(device.error)throw new Error('管理端末を登録できませんでした');
    core.remember(device);persistHint();open();return true;
  }
  async function boot(start){
    startApp=start;
    core=DeviceAccess.create({key:key,storage:localStorage,transport:raw,open:open,lock:lock,status:function(value){
      var note=$('deviceAccessStatus');if(note)note.textContent=value==='offline'?'通信を確認できません。登録は保持しています。接続が戻ると再試行します。':'';
    }});
    $('familyPair').onclick=pair;$('familyLogin').onclick=google;$('familyLogout').hidden=true;
    window.addEventListener('online',function(){if(core.current())core.check();});
    document.addEventListener('visibilitychange',function(){if(!document.hidden&&core.current())core.check();});
    try{if(await callback())return;}catch(e){lock();message(e.message);return;}
    var pending;try{pending=JSON.parse(localStorage.getItem(key+'-pending-registration')||'null');}catch(_){}
    if(pending){try{var check=await raw({action:'authCheck',familySession:pending.session});if(check.authenticated){core.remember({session:pending.session,device:true,manager:check.manager});localStorage.removeItem(key+'-pending-registration');}}catch(_){} }
    await core.boot();
  }
  async function mountDevices(){
    var panel=$('familyDevicePanel');if(!panel)return;panel.replaceChildren();
    var device=core&&core.current();if(!device)return;
    var h=document.createElement('h2');h.textContent='家族のアプリ登録';panel.append(h);
    var note=document.createElement('p');note.textContent='このアプリは登録済みです。日数による再ログインはありません。';panel.append(note);
    if(!device.manager)return;
    var invite=document.createElement('button');invite.className='btn-primary';invite.textContent='家族の招待コードを作る';panel.append(invite);
    var result=document.createElement('p');result.setAttribute('role','status');panel.append(result);
    invite.onclick=async function(){invite.disabled=true;try{
      var r=await core.request({action:'authCreateInvite'});result.textContent='24時間以内に一回使えます。ホーム画面のアプリから入力してください。';
      var input=document.createElement('input');input.readOnly=true;input.value=r.code;input.setAttribute('aria-label','家族の招待コード');panel.append(input);
      var copy=document.createElement('button');copy.textContent='コードをコピー';copy.onclick=function(){navigator.clipboard.writeText(r.code).catch(function(){input.select();});};panel.append(copy);
    }catch(e){result.textContent='通信できませんでした。登録は保持しています。';}finally{invite.disabled=false;}};
    try{
      var list=await core.request({action:'authDevices'});
      list.devices.forEach(function(d){var row=document.createElement('p');row.textContent=d.name+(d.current?'（この端末）':'');
        if(!d.current){var revoke=document.createElement('button');revoke.textContent='登録解除';revoke.onclick=async function(){if(!confirm(d.name+'の登録を解除しますか？'))return;try{await core.request({action:'authRevokeDevice',id:d.id});mountDevices();}catch(_){result.textContent='解除できませんでした。もう一度お試しください。';}};row.append(revoke);}panel.append(row);
      });
    }catch(_){result.textContent='一覧を取得できません。登録は保持しています。';}
  }
  window.FamilyAuth={boot:boot,request:function(body){return core.request(body);},mountDevices:mountDevices,isAuthorized:function(){return !!(core&&core.current());}};
})();
