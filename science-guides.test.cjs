const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const guides=require('./science-guides.js');
const rows=require('./weekly-curriculum.js').science;

assert.equal(guides.length,52,'Every scheduled science theme needs an explanation');
assert.deepEqual(guides.map(g=>g.title),rows.map(r=>r[0]),'Guide lookup must match the immutable curriculum');
assert.equal(new Set(guides.map(g=>g.challenge.question)).size,52,'Application questions must differ by topic');
for(const [i,g] of guides.entries()){
  assert(g.intro.length>=100&&g.intro.length<=220,`${g.title}: self-contained introductory lesson`);
  assert(g.intro.split('。').filter(Boolean).length>=3,`${g.title}: explain in separate sentences`);
  assert(g.example.length>=40,`${g.title}: a concrete example is required`);
  assert.equal(g.steps.length,3,`${g.title}: three thinking steps`);
  assert(g.steps.every(s=>typeof s==='string'&&s.length>=10));
  assert(g.mistakes.length>=35,`${g.title}: explain a misconception`);
  const q=g.challenge;
  assert.equal(q.choices.length,3);
  assert.equal(new Set(q.choices).size,3,`${g.title}: no duplicate options`);
  assert.equal(q.choices.filter(c=>c===q.answer).length,1,`${g.title}: one keyed answer`);
  assert(q.explanation.length>=45&&q.explanation.split('。').filter(Boolean).length>=2,`${g.title}: explain the answer, not just its label`);
  assert(![rows[i][1],rows[i][6]].includes(q.question),`${g.title}: apply knowledge in a new question`);
  assert(Object.values(g).every(v=>typeof v!=='string'||!v.includes('<script')));
}
// Verify the same data can be bundled into a plain browser script, without require or globals from Node.
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync('science-guides.js','utf8'),sandbox);
assert.equal(JSON.stringify(sandbox.window.ScienceGuides),JSON.stringify(guides));
// Independent quantitative checks for the authored application questions.
assert.equal(guides.find(g=>g.title==='水にとける食塩').challenge.answer,(80+4)+'g');
assert.equal(guides.find(g=>g.title==='てこのつり合い').challenge.answer,(1*2/1)+'個');
assert.equal(guides.find(g=>g.title==='ふりこの一往復').challenge.answer,(20/10)+'秒');
console.log('PASS: 52 aligned science guides, introductory lessons, examples, 156 reasoning steps, 52 unique 3-choice application questions, quantitative answers, browser/Node export parity.');
