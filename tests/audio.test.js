import test from 'node:test';
import assert from 'node:assert/strict';
import {Services} from '../js/services.js';
import {MEMBERS} from '../js/engine.js';
function fakeAudio(){
  let source;const buffers=[];const context={state:'running',sampleRate:24000,
    decodeAudioData:async()=>({length:4,getChannelData:()=>new Float32Array([.1,.2,-.2,.1])}),
    createBuffer:(channels,length,rate)=>{const data=new Float32Array(length);const b={getChannelData:()=>data};buffers.push(b);return b;},
    createBufferSource:()=>{source={playbackRate:{value:1},connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};return source;},
    createAnalyser:()=>({fftSize:256,connect(){},disconnect(){},getByteTimeDomainData(d){d.fill(128);}}),destination:{}};
  return {context,buffers,get source(){return source;}};
}
test('five xAI greetings are requested together and mixed into one aligned audio buffer',async()=>{
  const audio=fakeAudio(),s=new Services({audioMode:'xai',language:'de',rate:1},()=>''),requests=[];s.context=audio.context;
  const oldRAF=globalThis.requestAnimationFrame,oldCancel=globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
  s.request=async(path,options)=>{requests.push({path,body:options.body});return {arrayBuffer:async()=>new ArrayBuffer(8)};};
  try{
    const playback=s.speakGroup(MEMBERS,'Hallo!',()=>true);await new Promise(r=>setImmediate(r));
    assert.equal(requests.length,5);assert.equal(new Set(requests.map(r=>r.body.voice)).size,5);assert.equal(audio.source.started,true);
    assert.equal(audio.buffers.length,1);assert.equal(audio.source.buffer,audio.buffers[0]);assert.ok(Math.abs(audio.source.buffer.getChannelData(0)[1]-.85)<.0001);
    audio.source.onended();assert.equal(await playback,true);
  }finally{globalThis.requestAnimationFrame=oldRAF;globalThis.cancelAnimationFrame=oldCancel;}
});
test('interrupting the common greeting stops the single mixed source and settles playback',async()=>{
  const audio=fakeAudio(),s=new Services({audioMode:'xai',language:'fr',rate:1},()=>''),oldRAF=globalThis.requestAnimationFrame,oldCancel=globalThis.cancelAnimationFrame;
  s.context=audio.context;globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};s.request=async()=>({arrayBuffer:async()=>new ArrayBuffer(8)});
  try{const playback=s.speakGroup(MEMBERS,'Bonjour !',()=>true);await new Promise(r=>setImmediate(r));const source=audio.source;s.stopAudio();assert.equal(await playback,false);assert.equal(source.stopped,true);assert.equal(s.source,null);}finally{globalThis.requestAnimationFrame=oldRAF;globalThis.cancelAnimationFrame=oldCancel;}
});
