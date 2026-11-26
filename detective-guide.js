/* A day has one guide throughout the detective notebook, using the Japan calendar. */
(function(root){
  'use strict';
  var DAY=86400000,ANCHOR=Date.parse('2026-11-26T00:00:00Z');
  function choose(companions,now,overrideId,overrideDate){
    if(!Array.isArray(companions)||!companions.length)throw Error('案内役が登録されていません。');
    var instant=now===undefined?new Date():new Date(now);
    if(!Number.isFinite(instant.getTime()))throw Error('日付を確認してください。');
    var parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(instant),fields={};
    parts.forEach(function(part){fields[part.type]=part.value;});
    var date=fields.year+'-'+fields.month+'-'+fields.day;
    var manual=overrideDate===date?companions.find(function(c){return c.id===overrideId;}):null;
    // The first release day starts with Kotone (index 1); then advance every Japan midnight.
    var day=Math.floor((Date.parse(date+'T00:00:00Z')-ANCHOR)/DAY)+1;
    var index=((day%companions.length)+companions.length)%companions.length;
    return {date:date,partner:manual||companions[index],manual:!!manual};
  }
  var api={choose:choose};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DetectiveGuide=api;
})(typeof window!=='undefined'?window:globalThis);
