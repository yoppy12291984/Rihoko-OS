const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const Guide=require('./detective-guide.js');
const companions=Object.freeze(['rihoko','kotone','leo','haru','mina'].map(id=>Object.freeze({id,name:id})));
const pick=(time,id,date)=>Guide.choose(companions,new Date(time),id,date);
assert.equal(pick('2026-11-25T14:59:59.999Z').date,'2026-11-25');
assert.equal(pick('2026-11-25T15:00:00.000Z').date,'2026-11-26');
assert.equal(pick('2026-11-25T14:59:59.999Z').partner.id,'rihoko');
assert.equal(pick('2026-11-25T15:00:00.000Z').partner.id,'kotone');
assert.equal(pick('2026-11-26T14:59:59.999Z').partner.id,'kotone');
assert.equal(pick('2026-11-26T15:00:00.000Z').partner.id,'leo');
const seen=[];
for(let i=0;i<15;i++){
  const instant=new Date(Date.parse('2026-11-26T01:00:00Z')+i*86400000);
  const morning=Guide.choose(companions,instant),evening=Guide.choose(companions,new Date(+instant+12*3600000));
  assert.strictEqual(morning.partner,evening.partner,'same guide all day');
  assert.equal(morning.manual,false);
  seen.push(morning.partner.id);
  if(i)assert.notEqual(seen[i],seen[i-1],'next day changes guide');
  if(i>=5)assert.equal(seen[i],seen[i-5],'five-day cycle');
}
assert.equal(new Set(seen.slice(0,5)).size,5);
assert.equal(pick('2026-11-20T00:00:00Z').partner.id,'rihoko','negative offset is normalized');
const selected=pick('2026-11-26T07:00:00Z','mina','2026-11-26');
assert.equal(selected.manual,true);assert.strictEqual(selected.partner,companions[4]);
assert.equal(pick('2026-11-26T15:00:00Z','mina','2026-11-26').partner.id,'leo','manual override expires at Japan midnight');
for(const [id,date] of [['mina',undefined],['mina','2026-11-25'],['mina','2026-11-27'],['missing','2026-11-26']]){
  const value=pick('2026-11-26T07:00:00Z',id,date);assert.equal(value.manual,false);assert.equal(value.partner.id,'kotone');
}
assert.throws(()=>Guide.choose([],new Date()),/案内役/);
assert.throws(()=>Guide.choose(companions,new Date('invalid')),/日付/);
const script="const g=require('./detective-guide.js'); console.log(JSON.stringify(g.choose([{id:'rihoko'},{id:'kotone'},{id:'leo'},{id:'haru'},{id:'mina'}],new Date('2026-11-26T15:00:00Z'))))";
const outputs=['UTC','Asia/Tokyo','America/Los_Angeles'].map(TZ=>{const r=spawnSync(process.execPath,['-e',script],{cwd:__dirname,env:{...process.env,TZ},encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();});
assert.equal(new Set(outputs).size,1,'host timezone does not affect Japan date');
const sandbox={window:{},Intl,Date};vm.runInNewContext(fs.readFileSync(require.resolve('./detective-guide.js'),'utf8'),sandbox);
assert.equal(sandbox.window.DetectiveGuide.choose(companions,new Date('2026-11-26T07:00:00Z')).partner.id,'kotone');
console.log('PASS: Japan midnight boundary, same-day stability, five-day rotation, old and expired overrides, host timezone independence and browser export.');
