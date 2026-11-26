/* Provenance only: missing creation dates stay unknown; viewing never stamps data. */
(function(root){
  'use strict';
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function validDate(year,month,day){
    if(year<1||year>9999||month<1||month>12||day<1)return false;
    var leap=year%4===0&&(year%100!==0||year%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
    return day<=days[month-1];
  }
  function timestamp(value,field){
    if(typeof value!=='string')throw Error(field+' はタイムゾーン付きの日時で指定してください。');
    var m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    if(!m||!validDate(+m[1],+m[2],+m[3])||+m[4]>23||+m[5]>59||+(m[6]||0)>59)throw Error(field+' の日時が正しくありません。');
    var zone=m[8];
    if(zone!=='Z'){var h=+zone.slice(1,3),minute=+zone.slice(4,6);if(h>14||minute>59||(h===14&&minute!==0)||zone==='-00:00')throw Error(field+' のタイムゾーンが正しくありません。');}
    var expanded=m[1]+'-'+m[2]+'-'+m[3]+'T'+m[4]+':'+m[5]+':'+(m[6]||'00')+(m[7]?'.'+m[7]:'')+zone;
    var date=new Date(expanded);if(!Number.isFinite(date.getTime())||date.getUTCFullYear()<1||date.getUTCFullYear()>9999)throw Error(field+' の日時が正しくありません。');
    return date.toISOString();
  }
  function normalize(raw){
    if(raw==null)return {};
    if(typeof raw!=='object'||Array.isArray(raw))throw Error('教材の作成情報の形式を確認してください。');
    var result={};
    ['createdAt','updatedAt','importedAt'].forEach(function(key){if(raw[key]!==undefined)result[key]=timestamp(raw[key],key);});
    if(raw.generatorVersion!==undefined){
      if(typeof raw.generatorVersion!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,79}$/.test(raw.generatorVersion))throw Error('出題ルールの版は80文字以内の識別名で指定してください。');
      result.generatorVersion=raw.generatorVersion;
    }
    return result;
  }
  function jst(value){
    if(!value)return '';
    var parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)),map={};
    parts.forEach(function(p){map[p.type]=p.value;});
    return map.year+'/'+map.month+'/'+map.day+' '+map.hour+':'+map.minute+'（日本時間）';
  }
  function targetWeek(id){
    var m=/^(?:weekly-v[12]|growth-v1)-(\d{4})-(\d{2})-(\d{2})(?:-\d+)?$/.exec(id||'');
    return m&&validDate(+m[1],+m[2],+m[3])?m[1]+'/'+m[2]+'/'+m[3]+'の週':'';
  }
  function knownGenerator(id){
    if(/^weekly-v[12]-\d{4}-\d{2}-\d{2}$/.test(id)&&targetWeek(id))return id.slice(0,9);
    if(/^growth-v1-\d{4}-\d{2}-\d{2}-\d+$/.test(id)&&targetWeek(id))return 'growth-v1';
    if(/^practice-[a-z0-9-]+-\d+$/.test(id))return 'adaptive-lessons-v1';
    return '';
  }
  function describe(pack){
    pack=pack||{};var meta=normalize(pack),id=typeof pack.id==='string'?pack.id:'';
    var revision=Number.isSafeInteger(pack.revision)&&pack.revision>0?pack.revision:null;
    return {version:revision,versionLabel:revision?'v'+revision:'記録なし',createdAt:meta.createdAt||'',updatedAt:meta.updatedAt||'',importedAt:meta.importedAt||'',dateLabel:meta.createdAt?jst(meta.createdAt):'作成日時の記録なし',createdAtLabel:meta.createdAt?jst(meta.createdAt):'記録なし',updatedAtLabel:jst(meta.updatedAt),importedAtLabel:jst(meta.importedAt),generatorVersion:meta.generatorVersion||knownGenerator(id),targetWeek:targetWeek(id),id:id};
  }
  function compactHtml(pack){
    var d=describe(pack);
    return '<span class="pm-compact"><span>教材 '+esc(d.versionLabel)+'</span><span>'+(d.createdAt?'作成 <time datetime="'+esc(d.createdAt)+'">'+esc(d.dateLabel)+'</time>':esc(d.dateLabel))+'</span></span>';
  }
  function detailsHtml(pack,lessonId,questionId){
    var d=describe(pack),identity=[d.id,d.version===null?'?':d.version];
    if(lessonId!==undefined&&lessonId!==null&&lessonId!=='')identity.push(String(lessonId));
    if(questionId!==undefined&&questionId!==null&&questionId!=='')identity.push(String(questionId));
    var rows=[['教材の版',esc(d.versionLabel)],['作成日時',d.createdAt?'<time datetime="'+esc(d.createdAt)+'">'+esc(d.createdAtLabel)+'</time>':'記録なし']];
    if(d.updatedAt)rows.push(['更新日時','<time datetime="'+esc(d.updatedAt)+'">'+esc(d.updatedAtLabel)+'</time>']);
    if(d.importedAt)rows.push(['取り込み日時','<time datetime="'+esc(d.importedAt)+'">'+esc(d.importedAtLabel)+'</time>']);
    if(d.targetWeek)rows.push(['対象週',esc(d.targetWeek)]);
    if(d.generatorVersion)rows.push(['出題ルールの版',esc(d.generatorVersion)]);
    rows.push([questionId!==undefined&&questionId!==null?'問題ID':lessonId!==undefined&&lessonId!==null?'レッスンID':'問題セットID',esc(identity.join('/'))]);
    return '<details class="pm-details"><summary>問題セットの情報</summary><dl>'+rows.map(function(row){return '<div><dt>'+row[0]+'</dt><dd>'+row[1]+'</dd></div>';}).join('')+'</dl></details>';
  }
  var api={normalize:normalize,describe:describe,compactHtml:compactHtml,detailsHtml:detailsHtml};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProblemMetadata=api;
})(typeof window!=='undefined'?window:globalThis);
