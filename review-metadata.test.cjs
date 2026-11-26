const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Metadata=require('./problem-metadata.js');
const source=fs.readFileSync('review-study.js','utf8'),bundled=JSON.parse(fs.readFileSync('review-packs.json','utf8'));
const KEY='rihoko-review-v1',clone=v=>JSON.parse(JSON.stringify(v));
function storage(data={}){return {data:clone(data),fail:false,getItem(k){return this.data[k]||null;},setItem(k,v){if(this.fail)throw Error('quota');this.data[k]=v;}};}
let now='2026-11-26T01:02:03.000Z';
class ClockDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return new Date(now).getTime();}}
const context={module:{exports:{}},require,Date:ClockDate};vm.runInNewContext(source,context);const Review=context.module.exports;
const st=storage(),db=Review.createStore(st,bundled),base=db.packs()[0],lesson=base.lessons[0];
assert.equal(base.createdAt,undefined,'bundled question dates are not invented');
const session=db.start(base,lesson),q=session.lesson.questions[0],wrong=q.choices.find(c=>c!==q.answer);
assert.equal(session.pack.createdAt,undefined,'starting a session is not creating its questions');
db.update(session.id,0,{answer:wrong},'choice');
now='2026-11-26T03:04:05.000Z';
const checked=db.check(session.id,0),practice=db.packs().find(p=>p.id===checked.practice);
assert.equal(practice.createdAt,now);assert.equal(practice.generatorVersion,'adaptive-lessons-v1');assert.equal(practice.revision,1);
assert.notEqual(practice.createdAt,session.startedAt);
const generatedSnapshot=clone(practice),practiceSession=db.start(practice,practice.lessons[0]);
assert.deepEqual(clone(Metadata.normalize(practiceSession.pack)),Metadata.normalize(practice));
assert.deepEqual(clone(practiceSession.lesson),practice.lessons[0]);
now='2026-11-30T04:05:06.000Z';
assert(db.check(session.id,0).repeat);db.update(practiceSession.id,0,{hintSeen:true},'hint');
const reloaded=Review.createStore(st,bundled);
assert.deepEqual(clone(reloaded.packs().find(p=>p.id===practice.id)),generatedSnapshot,'checking, studying and reloading never restamp a generated pack');
assert.equal(reloaded.session(practiceSession.id).pack.createdAt,generatedSnapshot.createdAt);
assert.equal(reloaded.exportData().packs.find(p=>p.id===practice.id).createdAt,generatedSnapshot.createdAt);

// Existing practice has unknown creation time even when the source answer has a date.
const oldData=JSON.parse(st.data[KEY]);delete oldData.practice[0].createdAt;delete oldData.practice[0].generatorVersion;
oldData.sessions=oldData.sessions.filter(s=>s.id===session.id);oldData.sessions[0].startedAt='2020-01-01T00:00:00.000Z';
const oldStore=storage({[KEY]:JSON.stringify(oldData)}),oldBefore=oldStore.data[KEY],old=Review.createStore(oldStore,bundled);
assert.equal(oldStore.data[KEY],oldBefore,'viewing old practice leaves stored data unchanged');
assert.equal(old.packs().find(p=>p.id===practice.id).createdAt,undefined);
assert.equal(old.session(session.id).pack.createdAt,undefined);
assert(Metadata.compactHtml(old.packs().find(p=>p.id===practice.id)).includes('作成日時の記録なし'));
assert(!Metadata.detailsHtml(old.session(session.id).pack,lesson.id,'q1').includes('2020'));
// If an old mistake has no practice yet, its new practice gets today's actual generation time.
delete oldData.practice;const backfillStore=storage({[KEY]:JSON.stringify(oldData)}),backfilled=Review.createStore(backfillStore,bundled);
assert.equal(backfilled.packs().find(p=>p.id.startsWith('practice-')).createdAt,now);
assert.deepEqual(clone(backfilled.session(session.id)),oldData.sessions[0]);

const authored={...clone(base),id:'authored-metadata',revision:1,createdAt:'2026-11-01T09:10:11+09:00',updatedAt:'2026-11-20T12:13:14+09:00',importedAt:'2026-11-21T00:00:00Z',generatorVersion:'parent-pack-v2'};
const valid=Review.validatePack(JSON.stringify(authored));
assert.deepEqual(Metadata.normalize(valid),{createdAt:'2026-11-01T00:10:11.000Z',updatedAt:'2026-11-20T03:13:14.000Z',importedAt:'2026-11-21T00:00:00.000Z',generatorVersion:'parent-pack-v2'});
const imported=reloaded.importPack(authored);assert.equal(imported.importedAt,now);assert.equal(imported.createdAt,valid.createdAt);assert.equal(imported.updatedAt,valid.updatedAt);
const importedSession=reloaded.start(imported,imported.lessons[0]),fixedSession=clone(importedSession);
now='2026-12-01T05:06:07.000Z';
reloaded.importPack({...authored,revision:2,updatedAt:'2026-11-30T12:00:00+09:00'});
assert.deepEqual(clone(reloaded.session(importedSession.id)),fixedSession,'a newer pack cannot rewrite the previous session snapshot');
const exported=clone(reloaded.exportData()),newest=exported.packs.find(p=>p.id===authored.id);
assert.equal(newest.revision,2);assert.equal(newest.createdAt,valid.createdAt);assert.equal(newest.importedAt,now);assert.equal(newest.generatorVersion,authored.generatorVersion);
assert.deepEqual(exported.sessions.find(s=>s.id===importedSession.id).pack,fixedSession.pack);
for(const patch of [{createdAt:'2026-11-26T10:00:00'},{updatedAt:'2026-02-30T00:00:00Z'},{importedAt:42},{generatorVersion:'<script>bad()</script>'}]){
  const before=st.data[KEY];assert.throws(()=>reloaded.importPack({...authored,revision:3,...patch}));assert.equal(st.data[KEY],before,'invalid metadata must not alter storage');
}
const beforeFailedImport=st.data[KEY];st.fail=true;assert.throws(()=>reloaded.importPack({...authored,revision:3}));st.fail=false;
assert.equal(st.data[KEY],beforeFailedImport);assert.equal(reloaded.packs().find(p=>p.id===authored.id).revision,2);

// Printed question and answer sheets identify each individual question and carry the frozen pack metadata.
for(const answers of [false,true]){
  const print=Review.printHtml(fixedSession.lesson,answers,fixedSession.pack);
  assert(print.includes('教材の版'));assert(print.includes('v1'));assert(print.includes('2026/11/01 09:10（日本時間）'));
  assert(print.includes('取り込み日時'));assert(print.includes('parent-pack-v2'));assert.equal((print.match(/<details open/g)||[]).length,2);
  for(const id of ['q1','q2'])assert(print.includes('authored-metadata/1/'+fixedSession.lesson.id+'/'+id));
  assert.equal(print.includes('保護者用解答・解説'),answers);
}
assert(Review.printHtml(lesson,false).includes('記録なし'),'old two-argument print callers still work without inventing provenance');
assert(Review.printHtml(lesson,false,{id:'<script>',revision:1}).includes('&lt;script&gt;'));
assert(source.includes("printHtml(s.lesson,b.dataset.rsPrint==='answers',s.pack)"));
assert(source.includes("Metadata.detailsHtml(s.pack,s.lesson.id,'q'+(i+1))"));
console.log('PASS: review metadata normalization, actual generation time, immutable/reloaded provenance, unknown legacy dates, legacy backfill timing, session snapshots, imports/exports, rejected metadata, atomic import failure, unique question IDs and print metadata.');
