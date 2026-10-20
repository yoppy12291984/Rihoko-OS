/* プリントとごほうびの端末内保存。成功した書込みだけを保存済みとして扱う。 */
(function(root){
  'use strict';
  function create(storage,shared){
    var sheetKey='riho-worksheets-v1', rewardKey='riho-rewards-v1';
    function read(key){var value=JSON.parse(storage.getItem(key)||'[]');if(!Array.isArray(value))throw new Error('保存データを読み込めません');return value;}
    function worksheets(){return shared?shared.read("worksheets"):read(sheetKey);}
    function saveWorksheet(entry){
      if(!entry.id||!entry.worksheet||!Array.isArray(entry.worksheet.questions)||!entry.worksheet.questions.length)throw new Error('空のプリントは保存できません');
      if(shared)return shared.save("worksheets",entry);
      var list=worksheets(),i=list.findIndex(function(x){return x.id===entry.id;});
      if(i<0)list.push(entry);else list[i]=entry;
      storage.setItem(sheetKey,JSON.stringify(list));return entry;
    }
    function rewards(){return shared?shared.read("rewards"):read(rewardKey);}
    function claim(date,items){
      var list=rewards(),existing=list.find(function(x){return x.date===date;});
      if(existing)return existing;
      if(!items.length||!items.every(function(x){return x.done===true;}))return null;
      var entry={date:date,sticker:list.length%6,completed:items.length};
      if(shared)return shared.save("rewards",entry);
      list.push(entry);storage.setItem(rewardKey,JSON.stringify(list));return entry;
    }
    function reconcile(today,todos,routineDone,itemsForDate){
      var dates=new Set([today]),earned=new Set(rewards().map(function(r){return r.date;})),added=[];
      todos.forEach(function(t){if(t.date)dates.add(t.date);});
      Object.keys(routineDone).forEach(function(key){dates.add(key.slice(key.lastIndexOf('|')+1));});
      Array.from(dates).filter(function(date){return /^\d{4}-\d{2}-\d{2}$/.test(date)&&date<=today&&!earned.has(date);}).sort().forEach(function(date){
        var entry=claim(date,itemsForDate(date));if(entry)added.push(entry);
      });
      return added;
    }
    return {worksheets:worksheets,saveWorksheet:saveWorksheet,rewards:rewards,claim:claim,reconcile:reconcile};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={create:create};
  else root.StudyKeepsakes=create(root.localStorage,root.KeepsakeSync);
})(typeof window!=='undefined'?window:this);
