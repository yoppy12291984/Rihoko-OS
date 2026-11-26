const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const guides=require('./social-guides.js');
const rows=require('./weekly-curriculum.js').social;

assert.equal(guides.length,52);
assert.equal(new Set(guides.map(g=>g.title)).size,52);
assert.equal(new Set(guides.map(g=>g.challenge.question)).size,52);
guides.forEach((g,i)=>{
  const label=`social guide ${i+1}: ${g.title}`;
  assert.equal(g.title,rows[i][0],`${label} must align with immutable weekly topic`);
  assert(g.intro.length>=100&&g.intro.length<=220,`${label}: intro length`);
  const sentences=g.intro.match(/[。！？]/g)||[];
  assert(sentences.length>=3&&sentences.length<=5,`${label}: 3–5 teaching sentences`);
  assert(g.example.length>=30,`${label}: concrete example`);
  assert.equal(g.steps.length,3,`${label}: three learning steps`);
  assert(g.steps.every(s=>typeof s==='string'&&s.length>=10),`${label}: useful steps`);
  assert(g.mistakes.length>=30,`${label}: misconception explanation`);
  assert.equal(g.challenge.choices.length,3,`${label}: 3 choices`);
  assert.equal(new Set(g.challenge.choices).size,3,`${label}: unique choices`);
  assert.equal(g.challenge.choices.filter(c=>c===g.challenge.answer).length,1,`${label}: one correct answer`);
  assert(g.challenge.explanation.length>=55,`${label}: reasoned explanation`);
  const reasoningSentences=g.challenge.explanation.match(/[。！？]/g)||[];
  assert(reasoningSentences.length>=2&&reasoningSentences.length<=4,`${label}: 2–4 reasoning sentences`);
  assert.notEqual(g.challenge.question,rows[i][1],`${label}: application differs from basic q1`);
  assert.notEqual(g.challenge.question,rows[i][6],`${label}: application differs from basic q2`);
  assert(!/[<>]/.test(JSON.stringify(g)),`${label}: plain-text curriculum`);
});

// Confirm the same authored data is available in the browser without a module loader.
const browser={};browser.window=browser;
vm.runInNewContext(fs.readFileSync(require.resolve('./social-guides.js'),'utf8'),browser);
assert.equal(JSON.stringify(browser.SocialGuides),JSON.stringify(guides));
console.log('PASS: 52 social guides aligned to immutable curriculum; teaching lengths, examples, 3 steps, misconceptions, distinct application questions, unique choices, explanations and browser export.');
