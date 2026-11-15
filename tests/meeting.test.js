import test from 'node:test';
import assert from 'node:assert/strict';
import {Meeting,MEMBERS,LENSES,shuffled,parseObjection} from '../js/engine.js';
const config=()=>({participants:MEMBERS.map(p=>({...p,model:'test-model'})),rounds:3,autoRounds:true,topic:'Inklusion'});
function fake(overrides={}){return {ask:async(p,prompt)=>({text:prompt.includes('Antworte ausschließlich als JSON')?'{"raiseHand":false}':`${p.name}: Konkreter Vorschlag und begründete nächste Schritte.`}),speak:async()=>true,speakGroup:async()=>true,stopAudio:()=>{},...overrides};}
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
const tick=()=>new Promise(r=>setImmediate(r));
test('3-round meeting sends five contributions each round and exports summary plus attribution',async()=>{
  const prompts=[];const s=fake();const ask=s.ask;s.ask=async(p,prompt)=>{prompts.push({id:p.id,prompt});return ask(p,prompt);};const m=new Meeting(s,config());
  await m.submit('Wie machen wir den Workshop zugänglich?','Gast');
  assert.equal(m.phase,'complete');assert.equal(m.round,3);assert.equal(m.entries.filter(e=>e.kind==='contribution').length,15);assert.ok(m.summary);
  const initial=prompts.slice(0,5);assert.equal(new Set(initial.map(x=>x.id)).size,5);assert.ok(initial.every(x=>x.prompt.includes('Workshop zugänglich')));
  for(const {id,prompt} of initial)assert.ok(prompt.includes(LENSES[MEMBERS.findIndex(p=>p.id===id)]));
  assert.ok(prompts.some(x=>x.id==='claude'&&x.prompt.includes('Runde 2 von')&&x.prompt.includes(LENSES[1])));
  const out=m.exportText();for(const p of MEMBERS)assert.ok(out.includes(p.name));assert.ok(out.includes('ZUSAMMENFASSUNG'));assert.ok(out.includes('VOLLSTÄNDIGES GESPRÄCH'));assert.ok(out.includes('Gast'));
});
test('four rounds, automatic off, explicit continuation',async()=>{const m=new Meeting(fake(),{...config(),rounds:4,autoRounds:false});await m.submit('Frage');assert.equal(m.round,1);assert.equal(m.phase,'ready');await m.startNext();await m.startNext();await m.startNext();assert.equal(m.round,4);assert.equal(m.phase,'complete');});
test('PTT pause cancels old reasoning; all five get the new input; late responses discarded',async()=>{
  const delayed=deferred();let old=true,aborted=0;const prompts=[];
  const s=fake({ask:async(p,prompt,signal)=>{prompts.push(prompt);if(old){signal.addEventListener('abort',()=>aborted++);await delayed.promise;return {text:'STALE RESPONSE'};}return {text:prompt.includes('Antworte ausschließlich als JSON')?'{"raiseHand":false}':'Aktualisierter Vorschlag'};}});
  const m=new Meeting(s,{...config(),autoRounds:false});const running=m.submit('Erste Frage');await tick();assert.equal(m.busy,true);
  m.stop('Mensch spricht');old=false;const resumed=m.submit('Wichtige neue Grenze: maximal 500 Euro','Gast');await resumed;delayed.resolve();await running;
  assert.equal(aborted,5);assert.ok(!m.entries.some(e=>e.text.includes('STALE')));assert.equal(m.entries.filter(e=>e.kind==='contribution').length,5);
  assert.ok(prompts.slice(5,10).every(p=>p.includes('maximal 500 Euro')));
});
test('interrupted audio is marked; old playback cannot continue to next speaker',async()=>{
  const gate=deferred();let speaking=0;const s=fake({speak:async()=>{speaking++;await gate.promise;return false;},stopAudio:()=>gate.resolve(false)});
  // Do not resolve the playback gate during submit's initial stop.
  s.stopAudio=()=>{};const m=new Meeting(s,{...config(),autoRounds:false});const running=m.submit('Frage');await tick();assert.equal(speaking,1);m.stop('Unterbrechung');gate.resolve(false);await running;assert.equal(speaking,1);assert.equal(m.entries.find(e=>e.kind==='contribution').delivery,'interrupted');
});
test('one provider error pauses; retry only requests the missing contribution',async()=>{
  let fail=true;const s=fake();const normal=s.ask,counts={};s.ask=async(p,prompt)=>{if(!prompt.includes('Antworte ausschließlich als JSON'))counts[p.id]=(counts[p.id]||0)+1;if(p.id==='grok'&&fail)throw new Error('Provider unavailable');return normal(p,prompt);};const m=new Meeting(s,{...config(),autoRounds:false});
  await m.submit('Frage');assert.equal(m.phase,'paused');assert.equal(m.task.done.length,4);fail=false;await m.run();assert.equal(m.phase,'ready');assert.equal(m.entries.filter(e=>e.kind==='contribution').length,5);assert.equal(counts.grok,2);assert.equal(counts.claude,1);
});
test('reasoned hand raises are granted sequentially by Cameron and preserved in transcript',async()=>{
  const s=fake(),normal=s.ask;s.ask=async(p,prompt)=>prompt.includes('Antworte ausschließlich als JSON')?{text:p.id==='claude'?JSON.stringify({raiseHand:true,reason:'Fehlende Zugänglichkeit',text:'Groks Ansatz braucht eine zugängliche Alternative.'}):'{"raiseHand":false}'}:normal(p,prompt);
  const m=new Meeting(s,{...config(),autoRounds:false});const states=[];m.addEventListener('hands',e=>states.push(e.detail.items));await m.submit('Frage');
  const idx=m.entries.findIndex(e=>e.kind==='objection');assert.ok(idx>0);assert.equal(m.entries[idx-1].author,'cameron');assert.equal(m.entries[idx].author,'claude');assert.ok(states.some(h=>h.some(x=>x.id==='claude')));
});
test('failed hand-check is retried without repeating the four successful checks',async()=>{
  const calls={};let fail=true;const s=fake(),normal=s.ask;s.ask=async(p,prompt)=>{if(prompt.includes('Antworte ausschließlich als JSON')){calls[p.id]=(calls[p.id]||0)+1;if(p.id==='vibe'&&fail)throw new Error('timeout');}return normal(p,prompt);};const m=new Meeting(s,{...config(),autoRounds:false});await m.submit('Frage');assert.equal(m.phase,'paused');fail=false;await m.run();assert.equal(m.phase,'ready');assert.equal(calls.vibe,2);assert.equal(calls.claude,1);
});
test('audio failure pauses before the next member',async()=>{const m=new Meeting(fake({speak:async()=>{throw new Error('blocked');}}),config());await m.submit('Frage');assert.equal(m.phase,'paused');assert.equal(m.entries.filter(e=>e.kind==='contribution').length,1);assert.equal(m.entries.find(e=>e.kind==='contribution').delivery,'audio-error');});
test('limits prevent any additional provider requests',async()=>{let called=0;const s=fake({ask:async()=>{called++;return {text:'Beitrag'};}});const m=new Meeting(s,{...config(),maxCalls:2});await m.submit('Frage');assert.equal(called,2);assert.equal(m.phase,'paused');});
test('reset clears transcript, summary, pending work and late replies',async()=>{const d=deferred(),m=new Meeting(fake({ask:async()=>{await d.promise;return {text:'ALT'};}}),config());const r=m.submit('Frage');await tick();m.reset();d.resolve();await r;assert.deepEqual(m.entries,[]);assert.equal(m.summary,'');assert.equal(m.task,null);assert.equal(m.round,0);assert.equal(m.calls,0);});
test('manual intro works without model calls and introduces Cameron once',async()=>{let calls=0;const m=new Meeting(fake({ask:async()=>{calls++;throw new Error('not expected');}}),config());await m.introduce();assert.equal(calls,0);assert.equal(m.phase,'idle');assert.equal(m.entries.filter(e=>e.kind==='introduction').length,5);});
test('parser accepts only explicit, substantive hand raises; shuffle retains all members',()=>{assert.equal(parseObjection('yes'),null);assert.equal(parseObjection('{"raiseHand":"true","text":"X"}'),null);assert.equal(parseObjection('{"raiseHand":true,"text":" "}'),null);assert.equal(parseObjection('```json\n{"raiseHand":true,"text":"Begründung"}\n```').text,'Begründung');assert.deepEqual(shuffled([1,2,3],()=>0),[2,3,1]);});

test('first human greeting triggers five simultaneous hellos, then Cameron, then self-introductions without starting a round',async()=>{
  const actions=[];const s=fake({speakGroup:async(members,text)=>{actions.push({ids:members.map(m=>m.id),text});return true;},speak:async(p,text)=>{actions.push({id:p.id,text});return true;}});
  const m=new Meeting(s,config());await m.receive('Hallo Team, ich bin heute bei Sophie.','Frank');
  assert.equal(m.round,0);assert.equal(m.receptionDone,true);assert.equal(m.entries.filter(e=>e.kind==='team-greeting').length,5);
  assert.equal(actions[0].ids.length,5);assert.equal(actions[0].text,'Hallo!');assert.equal(actions[1].id,'cameron');
  assert.deepEqual(actions.slice(2,6).map(a=>a.id),['claude','grok','mistral','vibe']);
  assert.equal(m.entries.filter(e=>e.kind==='contribution').length,0);assert.ok(m.history().includes('Sophie'));
  await m.receive('Was können wir konkret umsetzen?','Sophie');assert.equal(m.round,3);assert.equal(m.phase,'complete');
  assert.equal(m.entries.filter(e=>e.kind==='human').at(-1).name,'Sophie');assert.equal(m.entries.filter(e=>e.kind==='team-greeting').length,5);
});
test('a paused group greeting rejects late playback and resumes the introduction before questions',async()=>{
  const gate=deferred();let first=true;const s=fake({speakGroup:async()=>{if(first){first=false;await gate.promise;}return true;}}),m=new Meeting(s,config());
  const running=m.receive('Hallo, wir sind bei Alex.','Frank');await tick();m.stop('PTT');gate.resolve();await running;
  assert.equal(m.receptionDone,false);assert.equal(m.entries.filter(e=>e.kind==='team-greeting'&&e.delivery==='interrupted').length,5);
  await m.receive('Alex begrüßt euch ebenfalls.','Alex');assert.equal(m.round,0);assert.equal(m.receptionDone,true);
});
test('reception reset requires a fresh greeting and context never leaks into the next session',async()=>{
  const m=new Meeting(fake(),config());await m.receive('Wir sind bei Alex.','Frank');m.reset();assert.equal(m.receptionDone,false);
  await m.receive('Heute sind wir bei Sam.','Frank');assert.equal(m.round,0);assert.ok(!m.history().includes('Alex'));assert.ok(m.history().includes('Sam'));
});
