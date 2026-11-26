const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const A=require('./adaptive-lessons.js'),R=require('./review-study.js'),L=require('./learning-content.js');
function storage(seed={}){return {data:{...seed},fail:false,getItem(k){return this.data[k]||null;},setItem(k,v){if(this.fail)throw Error('quota');this.data[k]=v;}};}
const review=JSON.parse(fs.readFileSync('review-packs.json','utf8'));
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('lesson-packs.js','utf8'),ctx);const bundled=JSON.parse(JSON.stringify(ctx.window.RihokoLessonPacks));
assert.equal(A.monday(new Date('2026-11-29T14:59:59Z')),'2026-11-23');
assert.equal(A.monday(new Date('2026-11-29T15:00:00Z')),'2026-11-30');
const initial=A.weekly(new Date('2026-11-26T00:00Z')),next=A.weekly(new Date('2026-11-30T00:00Z'));
assert.equal(initial.length,1);assert.equal(next.length,2);assert.deepEqual(next[1],initial[0]);
for(const p of A.weekly(new Date('2029-12-01T00:00Z'))){L.validate(p);assert.deepEqual(p.lessons.map(l=>l.subject),['理科','社会']);for(const l of p.lessons)for(const q of l.questions){assert([3,5].includes(q.choices.length));assert.equal(q.choices[q.correctChoice],q.answer);assert.equal(L.judge(q,{answer:q.answer}),'correct');assert.equal(L.judge(q,{answer:q.choices[(q.correctChoice+1)%q.choices.length]}),'retry');}}
for(const skill of Object.keys(A.titles))for(let n=1;n<=120;n++){const l=A.review(skill,n);R.validatePack({format:'rihoko-review-v1',id:'test',revision:1,title:'test',lessons:[l]});for(const q of l.questions){assert([3,5].includes(q.choices.length));assert.equal(new Set(q.choices).size,q.choices.length);assert.equal(q.choices[q.correctChoice],q.answer);}}
// Independent numeric checks against generator outputs, including exclusion and shared edges.
for(let serial=1;serial<=30;serial++)for(let i=0;i<2;i++){
 const n=serial*2+i+1,a=12+n%18,b=1+Math.floor(n/18)%3;
 assert.equal(A.review('gaps',serial).questions[i].answer,Array(a).fill(1).reduce((sum,x,j)=>sum+x+(j?b:0),0)+'こ');
 const cubes=2+n%7;assert.equal(A.review('shared-edges',serial).questions[i].answer,`玉${(cubes+1)*4}こ・棒${cubes*4+(cubes+1)*4}本`);
 const total=26+n%13,girls=10+n%8,hats=2+n%5;assert.equal(A.review('groups',serial).questions[i].answer,(total-girls-hats)+'人');
}
const st=storage(),r=R.createStore(st,review),p=r.packs()[0],l=p.lessons[0];assert.equal(p.revision,2);
const session=r.start(p,l),q=l.questions[0],wrong=q.choices.find(x=>x!==q.answer);
assert.throws(()=>r.check(session.id,0));r.update(session.id,0,{answer:wrong},'choice');assert.equal(r.check(session.id,0).correct,false);
assert.equal(r.packs().length,2);r.check(session.id,0);assert.equal(r.packs().length,2,'duplicate checks do not duplicate practice');
r.update(session.id,0,{answer:q.answer},'choice');assert.equal(r.check(session.id,0).correct,true);assert.equal(r.session(session.id).responses[0].initial.answer,wrong);
assert.equal(r.session(session.id).responses[0].hadMistake,true);assert.throws(()=>r.update(session.id,0,{rating:'self'},'rating'));
assert.equal(R.createStore(st,review).packs().length,2,'practice survives reload');
const generated=r.packs()[1],gs=r.start(generated,generated.lessons[0]);r.update(gs.id,0,{answer:gs.lesson.questions[0].choices.find(x=>x!==gs.lesson.questions[0].answer)},'choice');r.check(gs.id,0);assert.equal(r.packs().length,3,'wrong practice creates further practice');
// Atomic failure cannot claim a check or publish a generated lesson.
const st2=storage(),r2=R.createStore(st2,review),s2=r2.start(p,l);r2.update(s2.id,0,{answer:wrong},'choice');st2.fail=true;assert.throws(()=>r2.check(s2.id,0));assert.equal(r2.packs().length,1);assert(!r2.session(s2.id).responses[0].check);st2.fail=false;r2.check(s2.id,0);assert.equal(r2.packs().length,2);
const legacy={id:'old-session',pack:{id:review[0].id,revision:1,title:'old'},lesson:review[0].lessons[0],step:0,startedAt:'2026-11-20',responses:[{answer:'前の答え',drawing:[{type:'line',points:[{x:.1,y:.1},{x:.2,y:.2}]}]},{}],events:[]};
const oldStore=storage({'rihoko-review-v1':JSON.stringify({format:'rihoko-review-v1',packs:[],sessions:[legacy]})});const migrated=R.createStore(oldStore,review);assert.deepEqual(migrated.session('old-session'),legacy);assert.equal(migrated.packs()[0].revision,2);
const later=structuredClone(legacy);later.responses[0].rating='later';const laterStore=storage({'rihoko-review-v1':JSON.stringify({format:'rihoko-review-v1',packs:[],sessions:[later]})});const withPractice=R.createStore(laterStore,review);assert.equal(withPractice.packs().length,2);assert.deepEqual(withPractice.session(later.id),later);assert.equal(R.createStore(laterStore,review).packs().length,2);
let now=new Date('2026-11-26T00:00Z');const ls=storage(),learning=L.create(ls,bundled,()=>now);const wp=learning.packs().find(p=>p.id.startsWith('weekly-')),wl=wp.lessons[0],wq=wl.questions[0];
learning.save(wp,wl,wq,{answer:wq.answer,rating:'self'});assert.equal(learning.check(wp,wl,wq), 'correct');const before=learning.response(wp,wl,wq);now=new Date('2026-12-14T00:00Z');assert.equal(learning.packs().filter(p=>p.id.startsWith('weekly-')).length,5);assert.deepEqual(learning.response(wp,wl,wq),before);assert(learning.exportResults().packs.some(p=>p.id===wp.id));
const current=learning.packs().find(p=>p.id==='detective-five-subjects-2026');assert.deepEqual(current.lessons.map(l=>l.subject),['理科','理科','社会','社会']);assert(learning.exportResults().packs.some(p=>p.id===current.id&&p.revision===1));
for(const lesson of current.lessons)for(const q of lesson.questions){assert([3,5].includes(q.choices.length));assert.equal(L.judge(q,{answer:q.choices[q.correctChoice]}),'correct');}
learning.save(wp,wl,wq,{answer:wq.choices.find(x=>x!==wq.answer)});assert(!learning.response(wp,wl,wq).rating);assert(!learning.response(wp,wl,wq).check);
const bad=storage({'rihoko-review-v1':'broken'}),broken=R.createStore(bad,review);assert(broken.error());assert.throws(()=>broken.start(p,l));assert.equal(bad.data['rihoko-review-v1'],'broken');
const html=fs.readFileSync('index.html','utf8');for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);
console.log('PASS: JST weekly boundary, missed weeks, 158 weeks, 720 practice sets, independent arithmetic, choice validation, marking, idempotency, atomic quota failure, reload, legacy preservation, and bundled syntax.');
