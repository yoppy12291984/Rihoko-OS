/* 利用者の希望による一時的なログイン省略。認証版はバックアップから復旧する。 */
(function(){
  'use strict';
  async function request(payload){
    var controller=new AbortController();
    var timeout=setTimeout(function(){controller.abort();},30000);
    try {
      var response=await fetch(SORA_TOKEN_ENDPOINT,{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),signal:controller.signal});
      if(!response.ok) throw new Error('network_error');
      var data=await response.json();
      if(data.error) throw new Error(typeof data.error==='string'?data.error:'request_failed');
      return data;
    } finally {clearTimeout(timeout);}
  }
  function boot(start){
    document.documentElement.classList.add('family-authorized');
    document.getElementById('app').inert=false;
    document.getElementById('familyAuthGate').hidden=true;
    document.getElementById('familyLogout').hidden=true;
    start();
  }
  function mountDevices(){
    var panel=document.getElementById('familyDevicePanel');
    if(panel) panel.hidden=true;
  }
  window.FamilyAuth={boot:boot,request:request,mountDevices:mountDevices,isAuthorized:function(){return true;}};
})();
