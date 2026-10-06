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
    return {worksheets:worksheets,saveWorksheet:saveWorksheet,rewards:rewards,claim:claim};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={create:create};
  else root.StudyKeepsakes=create(root.localStorage,root.KeepsakeSync);
})(typeof window!=='undefined'?window:this);
