/* アプリごとの端末資格。通信障害と登録解除を区別し、通常起動では通信を待たない。 */
(function(root){
  'use strict';
  function create(options){
    var device=null;
    function remember(value){
      if(!value||!value.device||!/^[A-Za-z0-9_-]{43}$/.test(value.session||''))throw new Error('invalid_device');
      options.storage.setItem(options.key,JSON.stringify(value));device=value;return value;
    }
    function forget(){device=null;options.storage.removeItem(options.key);options.lock();}
    async function request(body){
      if(!device)throw new Error('registration_required');
      var result=await options.transport(Object.assign({},body,{familySession:device.session}));
      if(result.error==='device_revoked'){forget();throw new Error('device_revoked');}
      if(result.error)throw new Error(result.error);
      return result;
    }
    async function check(){
      try{var info=await request({action:'authCheck'});device.manager=info.manager===true;remember(device);options.status('ready');}
      catch(e){if(e.message!=='device_revoked')options.status('offline');}
    }
    function boot(){
      var saved;try{saved=JSON.parse(options.storage.getItem(options.key)||'null');}catch(_){}
      if(saved&&saved.device&&/^[A-Za-z0-9_-]{43}$/.test(saved.session||'')){device=saved;options.open();return check();}
      options.lock();return Promise.resolve();
    }
    return {boot:boot,remember:remember,request:request,check:check,forget:forget,current:function(){return device;}};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={create:create};else root.DeviceAccess={create:create};
})(typeof window!=='undefined'?window:globalThis);
