/* 認証前は既存の端末データを表示しない。セッションはタブ内だけに保持する。 */
(function(){
  'use strict';
  var sessionKey='riho-family-session', verifierKey='riho-family-verifier';
  var pendingKey='riho-family-login-pending';
  var deviceKey='riho-family-device';
  var session=null, timer=null;
  var preview=location.hostname==='127.0.0.1' || location.hostname==='localhost';
  function base64(bytes){return btoa(String.fromCharCode.apply(null,new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  function message(text){document.getElementById('familyAuthMessage').textContent=text;}
  function lock(text,forget){
    session=null; clearTimeout(timer); sessionStorage.removeItem(sessionKey);
    if(forget) localStorage.removeItem(deviceKey);
    document.documentElement.classList.remove('family-authorized');
    document.getElementById('app').inert=true;
    document.getElementById('familyAuthGate').hidden=false;
    if (text) message(text);
    if (typeof stopSora==='function') stopSora();
  }
  async function raw(payload){
    var controller=new AbortController(), timeout=setTimeout(function(){controller.abort();},30000);
    try {
      var response=await fetch(SORA_TOKEN_ENDPOINT,{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',
        headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),signal:controller.signal});
      if (!response.ok) throw new Error('network_error');
      var data=await response.json();
      if (data.error) throw new Error(typeof data.error==='string'?data.error:'request_failed');
      return data;
    } finally {clearTimeout(timeout);}
  }
  function unlock(){
    document.documentElement.classList.add('family-authorized');
    document.getElementById('app').inert=false;
    document.getElementById('familyAuthGate').hidden=true;
    document.getElementById('familyLogout').hidden=preview;
    if (session && !session.device) timer=setTimeout(function(){lock('ログインの有効期限が切れました。もう一度ログインしてください。');},Math.max(0,session.expires-Date.now()));
  }
  async function request(payload){
    if (!session || session.expires<=Date.now()) {lock('保護者のGoogleアカウントでログインしてください。');throw new Error('authentication_required');}
    try {return await raw(Object.assign({},payload,{familySession:session.session}));}
    catch(err){if (err.message==='authentication_required') lock('この端末の登録を確認できません。新しい招待コードで登録してください。',true);throw err;}
  }
  async function login(){
    var button=document.getElementById('familyLogin'); button.disabled=true;
    message('Googleのログイン画面を準備しています…');
    try {
      var verifier=base64(crypto.getRandomValues(new Uint8Array(32)));
      sessionStorage.setItem(verifierKey,verifier);
      var challenge=base64(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
      var data=await raw({action:'authStart',challenge:challenge,returnToApp:true});
      var destination=new URL(data.url);
      if (destination.origin!=='https://accounts.google.com') throw new Error('invalid_login_url');
      // 同じブラウザーの別タブで戻っても、10分以内なら開始した端末を確認できる。
      localStorage.setItem(pendingKey,JSON.stringify({state:destination.searchParams.get('state'),verifier:verifier,expires:Date.now()+600000}));
      location.assign(destination.href);
    } catch(err){message('ログインを開始できませんでした。通信と保護者の認証設定を確認し、もう一度お試しください。');button.disabled=false;}
  }
  async function boot(start){
    document.getElementById('familyPair').onclick=async function(){
      var button=this;button.disabled=true;message('この端末を登録しています…');
      try {
        // 保存できないブラウザーでは、1回限りの招待を消費する前に止める。
        localStorage.setItem('riho-storage-check','1');localStorage.removeItem('riho-storage-check');
        session=await raw({action:'authRedeemInvite',invite:document.getElementById('familyInvite').value,name:document.getElementById('familyDeviceName').value});
        localStorage.setItem(deviceKey,JSON.stringify(session));sessionStorage.removeItem(sessionKey);
        location.reload();
      } catch(err){message('登録できませんでした。通信を確認し、未使用で24時間以内の招待コードを入力してください。');button.disabled=false;}
    };
    document.getElementById('familyLogin').onclick=login;
    document.getElementById('familyLogout').onclick=async function(){
      if(!confirm('この端末の登録を解除しますか？ 次回は招待コードか保護者の初期設定が必要です。'))return;
      try {await request({action:'authLogout'});} catch(err) {}
      lock('この端末の登録を解除しました。端末内の未送信データは保持しています。',true);
      location.reload();
    };
    if (preview){unlock();start();return;}
    try {
      var query=new URLSearchParams(location.search), code=query.get('code'), oauthState=query.get('state');
      var fragment=new URLSearchParams(location.hash.slice(1)), ticket=fragment.get('family-login');
      if (code || oauthState || query.has('error')) history.replaceState(null,'',location.pathname);
      if (fragment.has('family-login') || fragment.has('family-login-error')) history.replaceState(null,'',location.pathname+location.search);
      if (fragment.has('family-login-error')) throw new Error('login_failed');
      if (query.has('error')) throw new Error('login_cancelled');
      if (code){
        var pending=JSON.parse(localStorage.getItem(pendingKey)||'null');
        if (!pending || pending.state!==oauthState || pending.expires<=Date.now()) throw new Error('login_browser_changed');
        message('ログインを確認しています。そのままお待ちください…');
        session=await raw({action:'authComplete',code:code,state:oauthState,verifier:pending.verifier});
        localStorage.removeItem(pendingKey);sessionStorage.removeItem(verifierKey);
        sessionStorage.setItem(sessionKey,JSON.stringify(session));
      } else if (ticket){
        var verifier=sessionStorage.getItem(verifierKey); sessionStorage.removeItem(verifierKey);
        session=await raw({action:'authExchange',ticket:ticket,verifier:verifier});
        sessionStorage.setItem(sessionKey,JSON.stringify(session));
      } else session=JSON.parse(localStorage.getItem(deviceKey)||sessionStorage.getItem(sessionKey)||'null');
      if (!session) {message('最初の1回だけ、おうちの人にもらった招待コードを入力してください。');return;}
      var checked=await request({action:'authCheck'});
      session.manager=checked.manager;session.device=checked.device===true || session.device===true;
      if(session.device){session.expires=checked.expires||session.expires;localStorage.setItem(deviceKey,JSON.stringify(session));}
      else {
        // 保護者の初期設定で一度Google認証した端末を、管理端末として登録する。
        session=await request({action:'authRemember',name:'保護者の管理端末'});
        localStorage.setItem(deviceKey,JSON.stringify(session));sessionStorage.removeItem(sessionKey);
      }
      unlock();start();
    } catch(err){
      var text=err.message==='login_browser_changed'?'ログインを始めたブラウザーと異なるか、時間が経っています。この画面の「Googleでログイン」からやり直してください。':
        err.message==='login_cancelled'?'ログインがキャンセルされました。もう一度ログインしてください。':
        err.name==='AbortError' || err.message==='Failed to fetch' || err.message==='Load failed'?'ログイン確認の通信が完了しませんでした。SafariでこのアプリのURLを直接開いて、もう一度お試しください。':
        'ログインを確認できませんでした。許可された保護者のアカウントで、もう一度お試しください。';
      lock(text);
    }
  }
  async function mountDevices(){
    var panel=document.getElementById('familyDevicePanel');if(!panel || !session || !session.manager)return;
    panel.innerHTML='<h2>家族の端末</h2><p>新しい端末には、招待コードを1回入力するだけ。コードは24時間・1台限りです。</p><button class="btn-primary" id="createFamilyInvite">招待コードをつくる</button><div id="familyInviteOutput"></div><div id="familyDevicesList"></div>';
    var output=panel.querySelector('#familyInviteOutput');
    panel.querySelector('#createFamilyInvite').onclick=async function(){
      this.disabled=true;
      try {var result=await request({action:'authCreateInvite'});output.textContent='家族の端末に、このコードを入力してください。';
        var field=document.createElement('input');field.readOnly=true;field.value=result.code;field.setAttribute('aria-label','招待コード');field.style.width='100%';field.style.fontSize='18px';output.appendChild(field);
        var copy=document.createElement('button');copy.textContent='コードをコピー';copy.onclick=async function(){try{await navigator.clipboard.writeText(result.code);copy.textContent='コピーしました';}catch(e){field.select();}};output.appendChild(copy);
      }catch(err){output.textContent='コードを作成できませんでした。通信を確認して、もう一度お試しください。';}finally{this.disabled=false;}
    };
    try {var data=await request({action:'authDevices'}),list=panel.querySelector('#familyDevicesList');
      data.devices.forEach(function(d){var row=document.createElement('p'),label=document.createElement('span');label.textContent=d.name+(d.current?'（この端末）':'');row.appendChild(label);
        var remove=document.createElement('button');remove.textContent='登録を解除';remove.onclick=async function(){if(!confirm(d.name+'の登録を解除しますか？ 次回は登録し直す必要があります。'))return;remove.disabled=true;
          try{await request({action:'authRevokeDevice',id:d.id});if(d.current){lock('この端末の登録を解除しました。',true);location.reload();}else row.remove();}catch(err){remove.disabled=false;output.textContent='解除を確認できませんでした。もう一度お試しください。';}};row.appendChild(remove);list.appendChild(row);});
    }catch(err){output.textContent='端末一覧を取得できませんでした。';}
  }
  window.FamilyAuth={boot:boot,request:request,mountDevices:mountDevices,isAuthorized:function(){return preview || !!session && session.expires>Date.now();}};
})();
