const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const A=require('./adaptive-lessons.js'),C=require('./weekly-curriculum.js'),D=require('./display-settings.js'),L=require('./learning-content.js');
assert.equal(C.science.length,52);assert.equal(C.social.length,52);
for(const rows of [C.science,C.social]){assert.equal(new Set(rows.map(r=>r[0])).size,52);for(const r of rows){assert.equal(r.length,11);for(const i of [1,6]){assert.equal(new Set(r.slice(i+1,i+4)).size,3);assert(r[i+4]);}}}
const first=C.packs(new Date('2026-11-26T00:00Z'),A),boundary=C.packs(new Date('2026-11-29T15:00Z'),A),all=C.packs(new Date('2027-11-15T00:00Z'),A);
assert.equal(first.length,2);assert.equal(boundary.length,3);assert.equal(all.length,53);
assert.deepEqual(boundary[1],first[0]);assert.deepEqual(first[1],A.weekly(new Date('2026-11-26T00:00Z'))[0]);
assert.equal(C.packs(new Date('2026-11-29T14:59:59Z'),A).length,2);
assert.equal(C.packs(new Date('2030-01-01T00:00Z'),A).length,53,'no silent recycled topics');
for(const p of all){L.validate(p);for(const l of p.lessons)for(const q of l.questions){assert.equal(L.judge(q,{answer:q.choices[q.correctChoice]}),'correct');assert.equal(L.judge(q,{answer:q.choices[(q.correctChoice+1)%3]}),'retry');}}
const records={},storage={getItem:k=>records[k]||null,setItem:(k,v)=>records[k]=v};let now=new Date('2026-11-26T00:00Z');const store=L.create(storage,[],()=>now);const p=first[0],l=p.lessons[0],q=l.questions[0];store.save(p,l,q,{answer:q.answer,rating:'self'});store.check(p,l,q);now=new Date('2027-11-15T00:00Z');assert.equal(store.packs().length,53);assert.equal(store.response(p,l,q).answer,q.answer);assert.equal(store.exportResults().packs.length,53);
assert.equal(D.read(storage),'light');for(const mode of ['light','dark','system']){D.save(storage,mode);assert.equal(D.read(storage),mode);}assert(D.isDark('dark',false));assert(!D.isDark('light',true));assert(D.isDark('system',true));assert(!D.isDark('system',false));assert.throws(()=>D.save(storage,'bad'));
const failing={getItem:()=>null,setItem(){throw Error('quota')}};assert.throws(()=>D.save(failing,'dark'));assert.equal(D.read(failing),'light');
for(const view of ['home','review','manabu','dekita','calendar']){const state={view,worksheetSubject:null,calSelectedDate:'2026-11-25',step:2};D.toggle(state,['home','review','manabu','dekita','calendar'],'home',530);assert.equal(state.view,'parent');const result=D.toggle(state,['home','review','manabu','dekita','calendar'],'home',0);assert.equal(state.view,view);assert.equal(result.scroll,530);assert.equal(state.step,2);assert.equal(state.calSelectedDate,'2026-11-25');}
const state={view:'manabu'};D.toggle(state,['manabu','home'],'home',0);D.toggle(state,['home'],'home',0);assert.equal(state.view,'home');
const html=fs.readFileSync('index.html','utf8');for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);assert(html.includes('if (gp) gp.onclick = toggleSettings;'));assert(html.includes('設定を閉じて元の画面に戻る'));assert(html.indexOf('id="weekly-curriculum-v2"')<html.indexOf('/* Reviewed lesson packs'));
const scripts=Array.from(html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g),m=>m[1]);
const main=scripts.find(s=>s.includes('var APP_VERSION ='));
assert(main.includes('function applyColorMode()'),'display helpers must be inside the main app scope');
assert(main.includes('function toggleSettings()'));
assert.equal(scripts.filter(s=>s.includes('function applyColorMode()')).length,1);
assert(!html.includes('boot:start=>start()'),'local preview auth stub must never ship');
assert(scripts.some(s=>s.includes('window.FamilyAuth={boot:boot')),'production auth remains bundled');
console.log('PASS: 104 unique themes, 312 questions, weekly boundaries, legacy preservation, year-end non-repetition, mode persistence/failure, system mode, 5 return views, hidden-tab fallback, main-app wiring, production auth, bundled syntax.');
