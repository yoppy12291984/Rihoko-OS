/* 未送信の変更を端末に残し、送信してから家族の最新データを取得する。 */
(function(root){
  'use strict';
  var cols = ['todos','events','units','routines'];
  function create(options){
    var key = 'riho-study-sync-v1', saved = JSON.parse(options.storage.getItem(key) || '{}');
    var queue = saved.queue || [], initialized = !!saved.initialized, running = null;
    function save(){ options.storage.setItem(key, JSON.stringify({queue:queue,initialized:initialized})); }
    function status(value){options.status(value,queue.length);}
    function validate(data){
      if (!data || !cols.every(function(c){return Array.isArray(data[c]);}) || !data.routineDone || typeof data.routineDone !== 'object') throw new Error('共有データの形式が不正です');
      return data;
    }
    function enqueue(op){
      queue.push(JSON.parse(JSON.stringify(op)));
      try {save();} catch(e){status('storage-error'); return;}
      refresh();
    }
    function applyPending(data){
      var next = JSON.parse(JSON.stringify(data));
      queue.forEach(function(op){
        if (op.type === 'done') next.routineDone[op.key] = op.done;
        else {
          var id = op.type === 'upsert' ? op.item.id : op.id;
          next[op.collection] = next[op.collection].filter(function(x){return x.id !== id;});
          if (op.type === 'upsert') next[op.collection].push(op.item);
        }
      });
      return next;
    }
    function refresh(importLocal){
      if (running) return running;
      var local = options.snapshot();
      if (!initialized && !importLocal && (cols.some(function(c){return local[c].length;}) || Object.keys(local.routineDone).length)) {status('setup'); return Promise.resolve();}
      running = (async function(){
        status('syncing');
        try {
          // 初回移行は保護者が明示した時だけ。共有側の同じIDは上書きしない。
          if (!initialized && importLocal) {
            var remote = validate(await options.pull());
            cols.forEach(function(c){local[c].forEach(function(item){
              if (!remote[c].some(function(x){return x.id === item.id;}) && !queue.some(function(op){return op.collection === c && (op.id || (op.item && op.item.id)) === item.id;})) queue.push({type:'upsert',collection:c,item:item});
            });});
            Object.keys(local.routineDone).forEach(function(k){if (!(k in remote.routineDone) && !queue.some(function(op){return op.type === 'done' && op.key === k;})) queue.push({type:'done',key:k,done:local.routineDone[k]});});
            initialized = true; save();
          }
          while (queue.length) {
            await options.send(queue[0]);
            queue.shift(); save();
          }
          var data = validate(await options.pull());
          options.apply(applyPending(data));
          initialized = true; save(); status(queue.length ? 'pending' : 'synced');
        } catch(e) {status('error');}
        finally {running = null;}
      })();
      return running;
    }
    async function adopt(){
      if (running) return running;
      try {
        options.storage.setItem('riho-study-before-sharing-v1', JSON.stringify(options.snapshot()));
        initialized = true; save();
      } catch(e){status('storage-error'); return;}
      return refresh();
    }
    return {enqueue:enqueue,refresh:refresh,adopt:adopt,pending:function(){return queue.length;}};
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {create:create};
  else root.FamilySync = {create:create};
})(typeof window !== 'undefined' ? window : globalThis);
