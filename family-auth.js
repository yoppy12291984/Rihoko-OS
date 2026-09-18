/* 認証前は既存の端末データを表示しない。セッションはタブ内だけに保持する。 */
(function(){
  'use strict';
  var sessionKey='riho-family-session', verifierKey='riho-family-verifier';
  var session=null, timer=null;
  var preview=location.hostname==='127.0.0.1' || location.hostname==='localhost';
  function base64(bytes){return btoa(String.fromCharCode.apply(null,new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  function message(text){document.getElementById('familyAuthMessage').textContent=text;}
  function lock(text){
    session=null; clearTimeout(timer); sessionStorage.removeItem(sessionKey);
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
    if (session) timer=setTimeout(function(){lock('ログインの有効期限が切れました。もう一度ログインしてください。');},Math.max(0,session.expires-Date.now()));
  }
  async function request(payload){
    if (!session || session.expires<=Date.now()) {lock('保護者のGoogleアカウントでログインしてください。');throw new Error('authentication_required');}
    try {return await raw(Object.assign({},payload,{familySession:session.session}));}
    catch(err){if (err.message==='authentication_required') lock('もう一度、保護者のアカウントでログインしてください。');throw err;}
  }
  async function login(){
    var button=document.getElementById('familyLogin'); button.disabled=true;
    message('Googleのログイン画面を準備しています…');
    try {
      var verifier=base64(crypto.getRandomValues(new Uint8Array(32)));
      sessionStorage.setItem(verifierKey,verifier);
      var challenge=base64(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
      var data=await raw({action:'authStart',challenge:challenge});
      var destination=new URL(data.url);
      if (destination.origin!=='https://accounts.google.com') throw new Error('invalid_login_url');
      location.assign(destination.href);
    } catch(err){message('ログインを開始できませんでした。通信と保護者の認証設定を確認し、もう一度お試しください。');button.disabled=false;}
  }
  async function boot(start){
    document.getElementById('familyLogin').onclick=login;
    document.getElementById('familyLogout').onclick=async function(){
      try {await request({action:'authLogout'});} catch(err) {}
      lock('ログアウトしました。端末内の未送信データは保持しています。');
      location.reload();
    };
    if (preview){unlock();start();return;}
    try {
      var fragment=new URLSearchParams(location.hash.slice(1)), ticket=fragment.get('family-login');
      if (fragment.has('family-login') || fragment.has('family-login-error')) history.replaceState(null,'',location.pathname+location.search);
      if (fragment.has('family-login-error')) throw new Error('login_failed');
      if (ticket){
        var verifier=sessionStorage.getItem(verifierKey); sessionStorage.removeItem(verifierKey);
        session=await raw({action:'authExchange',ticket:ticket,verifier:verifier});
        sessionStorage.setItem(sessionKey,JSON.stringify(session));
      } else session=JSON.parse(sessionStorage.getItem(sessionKey)||'null');
      if (!session) {message('おうちの人のGoogleアカウントでログインしてください。');return;}
      await request({action:'authCheck'});
      unlock();start();
    } catch(err){lock('ログインを確認できませんでした。許可された保護者のアカウントで、もう一度お試しください。');}
  }
  window.FamilyAuth={boot:boot,request:request,isAuthorized:function(){return preview || !!session && session.expires>Date.now();}};
})();
