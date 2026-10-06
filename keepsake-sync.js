/* 保存を確定した日記・プリント・スタンプの共有。未送信も一つのJSONへ原子的に保存する。 */
(function(root){
  'use strict';
  var names=['diaries','worksheets','rewards'];
  var legacy={diaries:'rihoko-kumi-diaries-v1',worksheets:'riho-worksheets-v1',rewards:'riho-rewards-v1'};
  function create(storage,request,notify){
    var key='riho-keepsake-sync-v1',running=null,send=request;
    var uid=function(){return 'op-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);};
    function load(){
      var raw=storage.getItem(key);
      if(raw)return JSON.parse(raw);
      var s={records:{diaries:[],worksheets:[],rewards:[]},queue:[]};
      names.forEach(function(c){
        var list=JSON.parse(storage.getItem(legacy[c])||'[]');
        if(!Array.isArray(list))throw new Error('保存データを読み込めません');
        list.forEach(function(item){
          item=JSON.parse(JSON.stringify(item));if(c==='rewards')item.id=item.date;
          if(!item.id)throw new Error('保存データのIDがありません');
          s.queue.push({collection:c,item:item,base:null,opId:uid()});
        });
      });
      // 旧キーは移行前の控えとして残す。書込み失敗時は移行済みにしない。
      storage.setItem(key,JSON.stringify(s));return s;
    }
    function status(v){if(notify)notify(v);if(root&&root.dispatchEvent&&typeof root.CustomEvent==='function')root.dispatchEvent(new root.CustomEvent('keepsake-status',{detail:{status:v}}));}
    function read(c){
      var s=load(),map=new Map(s.records[c].map(function(r){return [r.item.id,r.item];}));
      s.queue.filter(function(o){return o.collection===c;}).forEach(function(o){map.set(o.item.id,o.item);});
      return Array.from(map.values()).sort(function(a,b){return String(a.date||a.createdAt||a.id).localeCompare(String(b.date||b.createdAt||b.id));});
    }
    function save(c,item){
      var s=load();item=JSON.parse(JSON.stringify(item));if(c==='rewards')item.id=item.date;
      if(names.indexOf(c)<0||!item.id)throw new Error('保存形式が不正です');
      var record=s.records[c].find(function(r){return r.item.id===item.id;});
      s.queue.push({collection:c,item:item,base:record?record.revision:null,opId:uid()});
      storage.setItem(key,JSON.stringify(s));status('pending');refresh();return item;
    }
    function refresh(){
      if(running)return running;if(!send){status('local');return Promise.resolve();}
      running=(async function(){
        try{
          status('syncing');
          do {
            var s=load(),batch=s.queue.filter(function(o,i,a){return a.findIndex(function(x){return x.collection===o.collection&&x.item.id===o.item.id;})===i;}).slice(0,10);
            var reply=await send({action:'keepsakeSync',changes:batch});
            if(!reply||reply.version!==1||!names.every(function(c){return Array.isArray(reply.records&&reply.records[c]);})||!Array.isArray(reply.acked))throw new Error('共有先を更新してください');
            var latest=load(),ids=new Set(reply.acked);
            if(batch.some(function(o){return !ids.has(o.opId);}))throw new Error('共有の保存を確認できません');
            latest.queue=latest.queue.filter(function(o){return !ids.has(o.opId);});
            // 送信中・連続編集の次の操作を、自分の直前の保存へつなぐ。
            batch.forEach(function(o){var record=reply.records[o.collection].find(function(r){return r.revision===o.opId;});
              if(record)latest.queue.forEach(function(next){if(next.collection===o.collection&&next.item.id===o.item.id&&next.base===o.base){next.base=record.revision;next.item.id=record.item.id;}});
            });
            latest.records=reply.records;storage.setItem(key,JSON.stringify(latest));
            status(latest.queue.length?'pending':'synced');
          }while(load().queue.length);
        }catch(e){status('error');}
        finally{running=null;}
      })();return running;
    }
    return {read:read,save:save,refresh:refresh,connect:function(fn){send=fn;return refresh();}};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={create:create};
  else {
    var store=create(root.localStorage,null,function(value){
      var node=document.getElementById('keepsakeSyncStatus');
      if(node)node.textContent={local:'日記・プリント・スタンプ：この端末に保存',pending:'日記・プリント・スタンプ：未送信の記録があります',syncing:'日記・プリント・スタンプを共有中…',synced:'日記・プリント・スタンプ：共有済み',error:'日記・プリント・スタンプ：共有できません。記録は端末に残っています。「共有を更新」で再試行できます。'}[value];
      if(value==='synced')root.dispatchEvent(new Event('keepsakes-updated'));
    });
    root.KeepsakeSync=store;
  }
})(typeof window!=='undefined'?window:globalThis);
