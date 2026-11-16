import {Ringback} from './ringtone.js';
// Only the personal Worker access token reaches the browser. Provider keys stay in Worker secrets.
export class Services {
  constructor(config,getToken,onState=()=>{}) {this.config=config;this.getToken=getToken;this.onState=onState;this.audio=null;this.cancelPlayback=null;this.audioCtrl=null;this.context=null;this.source=null;this.analyser=null;this.frame=null;this.ringback=new Ringback(()=>this.context);}
  base(){const u=new URL(this.config.workerUrl);if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)))throw new Error('Worker benötigt HTTPS.');return u.href.replace(/\/+$/,'');}
  async request(path,{signal,body,method='POST'}={}){
    const headers={Authorization:`Bearer ${this.getToken()}`};
    if(body&&!(body instanceof FormData))headers['Content-Type']='application/json';
    const res=await fetch(this.base()+path,{method,headers,signal:signal?AbortSignal.any([signal,AbortSignal.timeout(100000)]):AbortSignal.timeout(100000),body:body instanceof FormData?body:body?JSON.stringify(body):undefined,cache:'no-store'});
    if(!res.ok){const j=await res.json().catch(()=>({}));throw new Error(j.error||`HTTP ${res.status}`);}return res;
  }
  async health(){const data=await (await this.request('/v1/health',{method:'GET'})).json();this.healthInfo=data;return data;}
  async checkGuest(guest,signal){const h=await (await this.request('/v1/health',{method:'GET',signal})).json();if(!h.providers?.includes(guest.provider)||!h.models?.[guest.provider]?.includes(guest.model))throw new Error(`${guest.name}: Worker aktualisieren, GEMINI_API_KEY und Modellfreigabe prüfen.`);}
  async voices(){return (await this.request('/v1/voices',{method:'GET'})).json();}
  async ask(p,prompt,signal,{purpose='dialogue'}={}){return (await this.request('/v1/chat',{signal,body:{provider:p.provider,model:p.model,prompt,maxTokens:2200,responseMode:this.config.responseMode||'live',purpose}})).json();}
  async research(query,language,signal){const provider=this.config.researchProvider||'openai';if(provider==='openai'&&this.healthInfo&&!this.healthInfo.research?.providers?.includes('openai'))throw new Error('OpenAI-Websuche benötigt Worker 2.6 mit freigegebenem OpenAI-Suchmodell.');try{return (await this.request('/v1/research',{signal,body:{query,language,provider}})).json();}catch(e){if(e.message==='Nicht gefunden.'||e.message==='HTTP 404')throw new Error('Webrecherche benötigt Worker 2.5. Bitte den Cloudflare-Code aktualisieren.');throw e;}}
  async transcribe(blob,signal){const data=new FormData();const ext=blob.type.includes('mp4')?'m4a':blob.type.includes('ogg')?'ogg':'webm';data.append('file',blob,`question.${ext}`);if(this.config.autoLanguage!==false&&this.healthInfo&&!this.healthInfo.voice?.autoLanguage)throw new Error('Automatische Sprachwahl benötigt Worker 2.9. Bitte Worker aktualisieren oder automatische Sprachwahl im Admin ausschalten.');data.append('language',this.config.autoLanguage!==false?'auto':this.config.language);return (await this.request('/v1/stt',{signal,body:data})).json();}
  unlock(){
    // Must run from a user gesture. Web Audio is also the later avatar mouth-envelope source.
    try{if(!this.context)this.context=new AudioContext();void this.context.resume();}catch{/* HTML audio remains available */}
  }
  startRinging(){if(this.config.audioMode!=='text')this.ringback.start();}
  stopRinging(){this.ringback.stop();}
  stopAudio(){
    this.stopRinging();
    this.audioCtrl?.abort();this.audioCtrl=null;
    if(this.cancelPlayback)this.cancelPlayback();
    if(this.audio){this.audio.pause();this.audio.src='';this.audio=null;}
    if(this.source){try{this.source.stop();}catch{}this.source=null;}
    if(this.frame)cancelAnimationFrame(this.frame);this.frame=null;this.onState('mouth',{id:null,value:0});
  }
  async speak(p,text,isCurrent,{volume=1}={}){
    this.stopAudio();if(!isCurrent())return false;
    if(this.config.audioMode==='text')return false;
    if(this.config.audioMode==='browser')return this.browserSpeech(p,text,isCurrent,volume);
    const ctrl=new AbortController();this.audioCtrl=ctrl;
    const res=await this.request('/v1/tts',{signal:ctrl.signal,body:{text,voice:p.voice,language:this.config.language}});
    const bytes=await res.arrayBuffer();if(!isCurrent())return false;
    if(this.context&&this.context.state==='running'){
      const buffer=await this.context.decodeAudioData(bytes);if(!isCurrent())return false;
      return new Promise((resolve,reject)=>{
        const source=this.context.createBufferSource(),analyser=this.context.createAnalyser();analyser.fftSize=256;
        source.buffer=buffer;source.playbackRate.value=Number(this.config.rate)||1;source.connect(analyser);const gain=this.context.createGain();gain.gain.value=volume;analyser.connect(gain);gain.connect(this.context.destination);
        this.source=source;this.analyser=analyser;
        const finish=value=>{if(this.source===source)this.source=null;if(this.frame)cancelAnimationFrame(this.frame);this.frame=null;this.cancelPlayback=null;this.onState('mouth',{id:p.id,value:0});resolve(value);};
        this.cancelPlayback=()=>{source.onended=null;try{source.stop();}catch{}finish(false);};
        source.onended=()=>finish(isCurrent());
        const data=new Uint8Array(analyser.fftSize);
        const tick=()=>{if(this.source!==source)return;analyser.getByteTimeDomainData(data);const rms=Math.sqrt(data.reduce((a,v)=>a+((v-128)/128)**2,0)/data.length);this.onState('mouth',{id:p.id,value:Math.min(1,rms*5)});this.frame=requestAnimationFrame(tick);};
        try{source.start();tick();}catch(e){this.cancelPlayback=null;reject(e);}
      });
    }
    const url=URL.createObjectURL(new Blob([bytes],{type:'audio/mpeg'}));const audio=new Audio(url);audio.playbackRate=Number(this.config.rate)||1;audio.volume=volume;this.audio=audio;
    return new Promise((resolve,reject)=>{
      const cleanup=()=>{URL.revokeObjectURL(url);this.cancelPlayback=null;if(this.audio===audio)this.audio=null;};
      this.cancelPlayback=()=>{audio.pause();cleanup();resolve(false);};
      audio.onended=()=>{cleanup();resolve(isCurrent());};audio.onerror=()=>{cleanup();reject(new Error('Audio konnte nicht abgespielt werden.'));};
      audio.play().catch(e=>{cleanup();reject(new Error('Audio vom Browser blockiert. Erneut auf Fortsetzen klicken. '+e.message));});
    });
  }
  browserSpeech(p,text,isCurrent,volume=1){
    if(!('speechSynthesis' in window))throw new Error('Browserstimme nicht verfügbar.');
    return new Promise((resolve,reject)=>{
      const u=new SpeechSynthesisUtterance(text);u.volume=volume;u.lang={de:'de-DE',fr:'fr-FR',en:'en-GB'}[this.config.language];u.rate=Number(this.config.rate)||1;
      const voices=speechSynthesis.getVoices().filter(v=>v.lang.startsWith(this.config.language));if(voices.length)u.voice=voices[Math.max(0,['claude','grok','cameron','mistral','vibe'].indexOf(p.id))%voices.length];
      this.cancelPlayback=()=>{speechSynthesis.cancel();this.cancelPlayback=null;resolve(false);};
      u.onend=()=>{this.cancelPlayback=null;resolve(isCurrent());};u.onerror=e=>{this.cancelPlayback=null;reject(new Error(e.error));};speechSynthesis.speak(u);
    });
  }
  setRate(value){this.config.rate=value;if(this.audio)this.audio.playbackRate=value;if(this.source)this.source.playbackRate.value=value;}
}
export class PushToTalk {
  constructor(services,{onStart,onText,onStatus,onError}){Object.assign(this,{services,onStart,onText,onStatus,onError});this.held=false;this.starting=false;this.processing=false;this.recorder=null;this.stream=null;this.generation=0;}
  async start(){
    if(this.held||this.starting||this.processing)return;this.held=true;this.starting=true;const gen=this.generation;
    this.onStart();this.onStatus('Mikrofon wird geöffnet …');
    try{
      if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Mikrofon benötigt HTTPS oder localhost und einen aktuellen Browser. Texteingabe bleibt möglich.');
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      if(gen!==this.generation||!this.held){stream.getTracks().forEach(t=>t.stop());if(gen===this.generation)this.onStatus('Aufnahme abgebrochen – Taste länger halten.');return;}
      this.stream=stream;const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t));
      const rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined),chunks=[];this.recorder=rec;
      rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      rec.onerror=()=>{this.onError(new Error('Mikrofonaufnahme fehlgeschlagen.'));this.cancel();};
      rec.onstop=async()=>{
        clearTimeout(this.timer);stream.getTracks().forEach(t=>t.stop());if(this.stream===stream)this.stream=null;this.recorder=null;
        if(gen!==this.generation)return;
        const blob=new Blob(chunks,{type:rec.mimeType});chunks.length=0;
        if(blob.size<200){this.onStatus('Keine Aufnahme erkannt.');return;}
        this.processing=true;this.ctrl=new AbortController();this.onStatus('Sprache wird erkannt …');
        try{const r=await this.services.transcribe(blob,this.ctrl.signal);if(gen!==this.generation)return;const text=String(r.text||'').trim();if(!text)throw new Error('Keine Sprache erkannt. Bitte erneut sprechen.');await this.onText(text);}
        catch(e){if(gen===this.generation)this.onError(e);}finally{if(gen===this.generation){this.processing=false;this.ctrl=null;}}
      };
      rec.start();this.onStatus('Aufnahme läuft – zum Senden loslassen');this.timer=setTimeout(()=>this.release(),60000);
    }catch(e){if(gen===this.generation){this.held=false;this.onError(e);}}finally{this.starting=false;}
  }
  release(){this.held=false;if(this.recorder?.state==='recording')this.recorder.stop();}
  cancel(){this.generation++;this.held=false;this.processing=false;clearTimeout(this.timer);this.ctrl?.abort();this.ctrl=null;if(this.recorder?.state==='recording')this.recorder.stop();this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.recorder=null;}
}
