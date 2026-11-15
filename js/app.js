import {Meeting,MEMBERS,LENSES} from './engine.js';
import {Services,PushToTalk} from './services.js';
import {Avatars} from './avatars.js';
import {defaultConfig} from './config.js';
const $=id=>document.getElementById(id);
const config=defaultConfig();
let token='',health=null,healthKey='',connectionBusy=false;
const avatars=new Avatars(config.participants);
const services=new Services(config,()=>token,(type,d)=>{if(type==='mouth')avatars.mouth(d.id,d.value);});
const meeting=new Meeting(services,config);meeting.config=config;
const labels={spoken:'vollständig vorgelesen',interrupted:'unterbrochen – vollständiger generierter Text',pending:'noch nicht vorgelesen','text-only':'nur Text','test-voice':'Gruppenwort mit einer Browser-Teststimme','audio-error':'Sprachausgabe fehlgeschlagen',text:'Text / Transkription'};
const logNodes=new Map();
const status=text=>{$('status').textContent=text;};
function speakerName(){return config.speaker==='guest'?(config.guestName.trim()||'Gast'):(config.hostName.trim()||'Frank');}
function refreshGuest(){$('guestLabel').textContent=config.guestName.trim()||'Gast';$('guest').hidden=!config.showGuest;}
function openAdmin(){fillSettings();updateButtons();if(!$('settingsDialog').open)$('settingsDialog').showModal();}
function closeAdmin(){if($('settingsDialog').open)$('settingsDialog').close();}
function hint(text){$('talkHint').textContent=text;}
function error(e){$('status').classList.add('error');status(e.message||String(e));hint('Kurze Pause · Details im Admin-Menü');if($('settingsDialog').open)$('connectionStatus').textContent=e.message||String(e);}
function download(name,text,type='text/plain;charset=utf-8'){
  const url=URL.createObjectURL(new Blob(['\ufeff',text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function exportMeeting(){if(!meeting.entries.length){status('Noch kein Gespräch vorhanden.');return;}download(`atelier-meeting-${new Date().toISOString().slice(0,10)}.txt`,meeting.exportText());}
function updateButtons(){
  const active=meeting.busy,recording=ptt.held||ptt.processing;
  $('introduce').disabled=active||recording;$('continue').disabled=active||recording;
  $('finish').disabled=active||recording||!meeting.entries.some(e=>e.kind==='human');
  // The admin menu and speaker switch remain available during a discussion.
  const always=new Set(['human','hostName','guestName','showGuest','subtitles','rate']);
  $('settingsForm').querySelectorAll('input,select,button').forEach(el=>{el.disabled=(active||recording)&&!always.has(el.id)&&!el.dataset.close;});
}

for(const m of config.participants){const node=document.createElement('div');node.className='seat-state';node.dataset.id=m.id;node.dataset.speaking='false';node.style.setProperty('--x',m.x+'%');node.style.setProperty('--c',m.color);const hand=document.createElement('span');hand.className='hand';hand.hidden=true;hand.textContent='✋';const badge=document.createElement('span');badge.className='badge';badge.textContent=m.name;node.append(hand,badge);$('seatStates').append(node);}
meeting.addEventListener('status',e=>{
  const {phase,text}=e.detail;$('status').classList.toggle('error',phase==='paused');status(text);
  const simple={thinking:'Das Team denkt nach …',speaking:text,paused:'Pause',idle:'Wir hören zu.',routing:'Cameron hört zu …',researching:'Cameron recherchiert im Web …',listening:text,ready:'Deine Frage oder Ergänzung?',complete:'Das Ergebnis ist bereit.'};
  const message=simple[phase]||'Wir hören zu.';$('stageStatus').textContent=message;hint(message);updateButtons();
});
meeting.addEventListener('change',updateButtons);
meeting.addEventListener('usage',e=>$('calls').textContent=`${e.detail.calls} KI-Anfragen`);
meeting.addEventListener('speaker',e=>{
  const ids=e.detail.ids||[e.detail.id].filter(Boolean),id=ids.length>1?'team':ids[0],p=config.participants.find(p=>p.id===id);
  $('stage').dataset.active=id||'';if(p){$('stage').style.setProperty('--sx',p.x+'%');$('stage').style.setProperty('--accent',p.color);}
  document.querySelectorAll('.seat-state').forEach(n=>n.dataset.speaking=String(ids.includes(n.dataset.id)));avatars.speaking(ids);if(!ids.length)$('subtitle').hidden=true;
});
meeting.addEventListener('round',e=>{const {round,total}=e.detail;$('roundLabel').textContent=`RUNDE ${round} / ${total}`;document.querySelectorAll('.seat-state').forEach(n=>{const idx=MEMBERS.findIndex(m=>m.id===n.dataset.id);n.title=LENSES[(idx+round-1)%LENSES.length];});});
meeting.addEventListener('hands',e=>{document.querySelectorAll('.seat-state').forEach(n=>{const h=e.detail.items.find(h=>h.id===n.dataset.id);n.querySelector('.hand').hidden=!h;if(h)n.querySelector('.hand').title=h.reason;});avatars.hands(e.detail.items);});
meeting.addEventListener('entry',e=>{
  const item=e.detail,node=document.createElement('article');node.className='log-entry '+item.kind;const title=document.createElement('strong'),meta=document.createElement('small'),p=document.createElement('p');title.textContent=item.name;meta.textContent=`Runde ${item.round} · ${labels[item.delivery]||item.delivery} · ${new Date(item.time).toLocaleTimeString()}`;p.textContent=item.text;node.append(title,meta,p);$('transcriptLog').append(node);logNodes.set(item.id,{node,meta});$('entryCount').textContent=meeting.entries.length;
  if(config.subtitles&&item.kind!=='research'&&item.author!=='System'&&!item.kind.startsWith('human')){$('subtitleName').textContent=item.name;$('subtitleText').textContent=item.text;$('subtitle').hidden=false;}
});
meeting.addEventListener('delivery',e=>{const item=e.detail;const record=logNodes.get(item.id);if(record)record.meta.textContent=`Runde ${item.round} · ${labels[item.delivery]||item.delivery} · ${new Date(item.time).toLocaleTimeString()}`;});
meeting.addEventListener('summary',e=>{$('result').textContent=e.detail.text||'Noch kein Ergebnis erstellt.';$('resultPanel').open=!!e.detail.text;});
meeting.addEventListener('research',e=>{
  const r=e.detail,item=document.createElement('article'),heading=document.createElement('strong'),text=document.createElement('p'),links=document.createElement('ul');
  item.className='log-entry';heading.textContent=r.query+' · '+(r.provider==='openai'?'OpenAI':'xAI')+' · '+new Date(r.checkedAt).toLocaleString();text.textContent=r.text;
  for(const source of r.sources){const li=document.createElement('li'),a=document.createElement('a');a.textContent=source.title+' — '+new URL(source.url).hostname;a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';li.append(a);links.append(li);}
  item.append(heading,text,links);$('researchList').append(item);$('researchPanel').open=true;
});
meeting.addEventListener('reset',()=>{$('transcriptLog').replaceChildren();logNodes.clear();$('result').textContent='Noch kein Ergebnis erstellt.';$('resultPanel').open=false;$('researchList').replaceChildren();$('researchPanel').open=false;$('entryCount').textContent='0';$('calls').textContent='0 KI-Anfragen';$('roundLabel').textContent='Noch keine Gesprächsrunde';$('question').value='';$('subtitle').hidden=true;avatars.reset();$('stage').dataset.listening='false';hint('Wir hören zu.');updateButtons();});
function currentHealthKey(){return config.workerUrl+'\n'+token;}
async function checkConnection(){
  if(connectionBusy)return false;connectionBusy=true;const key=currentHealthKey();health=null;
  try{health=await services.health();if(key!==currentHealthKey())return false;healthKey=key;const names=(health.providers||[]).join(', ')||'keine';$('connectionStatus').textContent=`Worker ${health.version||'ältere Version'} erreichbar. Textanbieter: ${names}. xAI TTS: ${health.voice?.tts?'bereit':'fehlt'}. STT: ${health.voice?.stt?'bereit':'fehlt'}. Websuche: ${health.research?.enabled?'eingerichtet':'Worker 2.5 erforderlich'}. Kostenlimit: ${health.limiter?'atomar':health.kv?'KV (ungefähr)':'nicht eingerichtet'}.`;return true;}
  catch(e){$('connectionStatus').textContent=e.message;error(e);return false;}finally{connectionBusy=false;}
}
async function ready({intro=false,microphone=false,routing=false}={}){
  if(intro&&config.audioMode!=='xai')return true;
  if(!config.workerUrl||!token){openAdmin();throw new Error('Bitte Worker-Adresse und persönliches Zugangstoken eintragen.');}
  if(healthKey!==currentHealthKey()||!health){if(!await checkConnection())throw new Error('Worker-Verbindung nicht verfügbar.');}
  if(microphone){if(!health.voice?.stt)throw new Error('Der Worker benötigt die neue STT-Anbindung.');return true;}
  if(config.audioMode==='xai'&&!health.voice?.tts)throw new Error('Der Worker benötigt die neue xAI-Sprachanbindung.');
  if(intro)return true;
  const checked=routing?config.participants.filter(p=>p.id==='cameron'):config.participants;
  const missing=checked.filter(p=>!p.model||!(health.providers||[]).includes(p.provider)||(health.models?.[p.provider]&&!health.models[p.provider].includes(p.model)));
  if(missing.length){openAdmin();throw new Error('Modell oder Freigabe fehlt: '+missing.map(p=>p.name).join(', '));}
  return true;
}
function action(fn){return async()=>{services.unlock();try{await fn();}catch(e){error(e);}finally{updateButtons();}};}
$('introduce').addEventListener('click',action(async()=>{await ready({intro:true});closeAdmin();await meeting.introduce();}));
$('continue').addEventListener('click',action(async()=>{await ready({intro:meeting.task?.kind==='intro'});closeAdmin();await meeting.startNext();}));
$('pause').addEventListener('click',()=>{ptt.cancel();meeting.stop('Pause – mit Fortsetzen weiterarbeiten');$('ptt').setAttribute('aria-pressed','false');$('micStatus').textContent='Pausiert';updateButtons();});
$('finish').addEventListener('click',action(async()=>{await ready();closeAdmin();await meeting.finish();}));
async function submitQuestion(text,name=speakerName()){
  await ready({routing:true});closeAdmin();await meeting.receive(text,name);
}
$('questionForm').addEventListener('submit',async e=>{
  e.preventDefault();services.unlock();const text=$('question').value.trim();if(!text)return;ptt.cancel();
  try{await ready({routing:true});const name=speakerName();$('question').value='';closeAdmin();await meeting.receive(text,name);}
  catch(err){$('question').value=text;error(err);}updateButtons();
});
let recordingSpeaker=config.hostName;
const ptt=new PushToTalk(services,{
  onStart:()=>{recordingSpeaker=speakerName();$('stage').dataset.listening='true';meeting.stop('Mensch spricht – Team pausiert');$('ptt').setAttribute('aria-pressed','true');updateButtons();},
  onStatus:text=>{$('micStatus').textContent=text;hint(text);updateButtons();},
  onText:async text=>{
    $('question').value=[$('question').value.trim(),text].filter(Boolean).join('\n');
    $('micStatus').textContent='Sprache erkannt';$('stage').dataset.listening='false';$('ptt').setAttribute('aria-pressed','false');
    if($('autoSend').checked){const value=$('question').value;try{await ready({routing:true});$('question').value='';// Do not keep the microphone busy through the entire multi-round meeting.
      ptt.processing=false;void submitQuestion(value,recordingSpeaker).catch(e=>{$('question').value=value;error(e);}).finally(updateButtons);
    }catch(e){error(e);}}else{openAdmin();$('micStatus').textContent='Text prüfen, dann ans Team senden.';hint('Text im Admin-Menü prüfen.');}
    updateButtons();
  },
  onError:e=>{$('stage').dataset.listening='false';$('ptt').setAttribute('aria-pressed','false');$('micStatus').textContent=e.message;error(e);updateButtons();}
});
let pttWanted=false;
async function beginPTT(){if(pttWanted||ptt.processing||ptt.starting)return;pttWanted=true;services.unlock();meeting.stop('Push-to-Talk – Team pausiert');try{await ready({microphone:true});if(pttWanted)await ptt.start();}catch(e){error(e);pttWanted=false;}}
function endPTT(){pttWanted=false;ptt.release();$('stage').dataset.listening='false';$('ptt').setAttribute('aria-pressed','false');updateButtons();}
$('ptt').addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();$('ptt').setPointerCapture(e.pointerId);void beginPTT();});
$('ptt').addEventListener('pointerup',endPTT);$('ptt').addEventListener('pointercancel',endPTT);$('ptt').addEventListener('lostpointercapture',endPTT);
function editing(e){return !!e.target.closest('input,textarea,select,[contenteditable=true]')||!!document.querySelector('dialog[open]');}
document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.altKey&&e.code==='KeyA'){e.preventDefault();if($('settingsDialog').open)closeAdmin();else openAdmin();return;}if(e.code==='Space'&&!editing(e)&&!e.altKey&&!e.ctrlKey&&!e.metaKey){e.preventDefault();if(!e.repeat)void beginPTT();}if(e.key==='Escape'&&!document.querySelector('dialog[open]')){pttWanted=false;ptt.cancel();meeting.stop('Pausiert');}});
document.addEventListener('keyup',e=>{if(e.code==='Space'&&pttWanted){e.preventDefault();endPTT();}});
window.addEventListener('blur',endPTT);
document.addEventListener('visibilitychange',()=>{if(document.hidden)endPTT();});
window.addEventListener('beforeunload',e=>{ptt.cancel();services.stopAudio();if(meeting.entries.length){e.preventDefault();e.returnValue='';}});
$('settingsOpen').addEventListener('click',openAdmin);
$('transcriptOpen').addEventListener('click',()=>{$('transcriptDialog').showModal();});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
$('exportTxt').addEventListener('click',exportMeeting);$('exportResult').addEventListener('click',exportMeeting);
$('deleteSession').addEventListener('click',()=>{if(confirm('Sitzung und Ergebnis aus dieser Anwendung löschen? Bitte vorher den TXT-Export prüfen.')){pttWanted=false;ptt.cancel();meeting.reset();$('micStatus').textContent='Mikrofon nur bei gedrückter Taste';$('ptt').setAttribute('aria-pressed','false');}});
$('fullscreen').addEventListener('click',()=>{if(document.fullscreenElement)void document.exitFullscreen();else document.body.requestFullscreen().catch(error);});
function memberFields(){
  $('memberSettings').replaceChildren();
  for(const p of config.participants){const row=document.createElement('div');row.className='member-row';row.style.setProperty('--c',p.color);row.dataset.id=p.id;const title=document.createElement('strong');title.textContent=p.name;row.append(title);
    const label=document.createElement('label');label.textContent='Anbieter';const select=document.createElement('select');select.dataset.field='provider';for(const [value,text] of Object.entries({openai:'OpenAI',anthropic:'Anthropic',xai:'xAI',mistral:'Mistral'})){const o=document.createElement('option');o.value=value;o.textContent=text;select.append(o);}select.value=p.provider;label.append(select);row.append(label);
    for(const [field,text] of [['model','Modellkennung'],['voice','xAI-Stimme']]){const l=document.createElement('label');l.textContent=text;const input=document.createElement('input');input.dataset.field=field;input.value=p[field];input.placeholder=field==='model'?'Im Worker freigegebene ID':'eve';input.maxLength=150;if(field==='voice')input.setAttribute('list','voiceList');l.append(input);row.append(l);}
    $('memberSettings').append(row);
  }
}
function fillSettings(){for(const id of ['workerUrl','topic','language','rounds','audioMode','rate','maxCalls','responseMode','researchProvider','hostName','guestName'])$(id).value=config[id];$('accessToken').value=token;$('autoSend').checked=config.autoSend;$('human').value=config.speaker;$('showGuest').checked=config.showGuest;$('subtitles').checked=config.subtitles;$('autoRounds').checked=config.autoRounds;$('rateValue').textContent=config.rate.toFixed(1)+'×';memberFields();}
function applySettings(){
  const next={};for(const id of ['workerUrl','topic','language','audioMode','responseMode','researchProvider','hostName','guestName'])next[id]=$(id).value.trim();
  if(next.workerUrl){const u=new URL(next.workerUrl);if(u.username||u.password||u.search||u.hash)throw new Error('Worker-Adresse ohne Zugangsdaten, Query oder Fragment eingeben.');if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)))throw new Error('Worker-Adresse muss HTTPS verwenden.');}
  next.rounds=Number($('rounds').value);next.maxCalls=Number($('maxCalls').value);next.rate=Number($('rate').value);next.autoRounds=$('autoRounds').checked;next.autoSend=$('autoSend').checked;next.speaker=$('human').value;next.showGuest=$('showGuest').checked;next.subtitles=$('subtitles').checked;
  if(meeting.round>next.rounds)throw new Error('Die Rundenzahl kann nicht unter die laufende Runde gesenkt werden.');
  Object.assign(config,next);token=$('accessToken').value.trim();
  for(const row of $('memberSettings').children){const p=config.participants.find(p=>p.id===row.dataset.id);for(const field of ['provider','model','voice'])p[field]=row.querySelector(`[data-field="${field}"]`).value.trim();}
  refreshGuest();if(!config.subtitles)$('subtitle').hidden=true;services.setRate(config.rate);
}
$('settingsForm').addEventListener('submit',e=>{e.preventDefault();try{applySettings();$('settingsDialog').close();status('Einstellungen übernommen. Flexible Ansprache aktiv.');hint('Wir hören zu.');}catch(err){error(err);}});
$('checkConnection').addEventListener('click',async()=>{try{applySettings();await checkConnection();}catch(e){error(e);}});
$('loadVoices').addEventListener('click',async()=>{try{applySettings();const data=await services.voices();$('voiceList').replaceChildren();for(const v of data.voices||[]){const o=document.createElement('option');o.value=v.voice_id;o.label=v.name||v.voice_id;$('voiceList').append(o);}$('connectionStatus').textContent=`${(data.voices||[]).length} Stimmen geladen. Gewünschte IDs müssen im Worker freigegeben sein.`;}catch(e){error(e);}});
$('rate').addEventListener('input',()=>{const rate=Number($('rate').value);$('rateValue').textContent=rate.toFixed(1)+'×';services.setRate(rate);});
$('exportConfig').addEventListener('click',()=>{try{applySettings();download('atelier-meeting.config.json',JSON.stringify({schema:'atelier/meeting-2.6',settings:{...config,participants:undefined},participants:config.participants.map(({id,name,provider,model,voice})=>({id,name,provider,model,voice}))},null,2),'application/json');}catch(e){error(e);}});
$('importConfig').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{if(file.size>100000)throw new Error('Konfiguration zu groß.');const data=JSON.parse((await file.text()).replace(/^\ufeff/,''));const settings=data.settings||{};
    for(const k of ['workerUrl','topic','hostName','guestName'])if(typeof settings[k]==='string')config[k]=settings[k];
    if(['live','balanced','deep'].includes(settings.responseMode))config.responseMode=settings.responseMode;
    if(['openai','xai'].includes(settings.researchProvider))config.researchProvider=settings.researchProvider;
    if(['de','fr','en'].includes(settings.language))config.language=settings.language;
    const rounds=Number(settings.rounds||settings.defaultRounds);if([3,4].includes(rounds))config.rounds=rounds;
    if(['xai','browser','text'].includes(settings.audioMode))config.audioMode=settings.audioMode;
    if(['host','guest'].includes(settings.speaker))config.speaker=settings.speaker;
    for(const key of ['showGuest','subtitles','autoSend'])if(typeof settings[key]==='boolean')config[key]=settings[key];
    if(typeof settings.autoRounds==='boolean')config.autoRounds=settings.autoRounds;
    if(Number(settings.maxCalls)>=20&&Number(settings.maxCalls)<=250)config.maxCalls=Number(settings.maxCalls);
    for(const p of Array.isArray(data.participants)?data.participants:[]){const target=config.participants.find(m=>m.id===p.id||(p.id==='guest'&&p.name==='Mistral'&&m.id==='mistral'));if(!target)continue;if(['openai','anthropic','xai','mistral'].includes(p.provider))target.provider=p.provider;for(const k of ['model','voice'])if(typeof p[k]==='string')target[k]=p[k].slice(0,150);}
    health=null;fillSettings();refreshGuest();$('connectionStatus').textContent='Konfiguration importiert. Zugangstoken separat eingeben und Verbindung prüfen.';
  }catch(err){error(err);}finally{e.target.value='';}
});
// Read-only debug API: useful to inspect a stopped test session, never contains the token.
window.AtelierMeeting={get state(){return {phase:meeting.phase,round:meeting.round,calls:meeting.calls,entries:structuredClone(meeting.entries),summary:meeting.summary};}};
$('human').addEventListener('change',()=>{config.speaker=$('human').value;});
for(const id of ['hostName','guestName'])$(id).addEventListener('input',()=>{config[id]=$(id).value.slice(0,80);refreshGuest();});
$('showGuest').addEventListener('change',()=>{config.showGuest=$('showGuest').checked;refreshGuest();});
$('subtitles').addEventListener('change',()=>{config.subtitles=$('subtitles').checked;if(!config.subtitles)$('subtitle').hidden=true;});
fillSettings();refreshGuest();updateButtons();
