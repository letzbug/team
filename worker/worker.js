/*
 * Creative Evolution Atelier · Cloudflare Worker (Meeting Room 2.0, Adapter mit simulierten Antworten geprüft; echte Anbieter noch nicht geprüft)
 *
 * Aufgabe: einzige Stelle, an der Anbieter-Schlüssel liegen. Der Browser schickt nur Prompt,
 * Anbieter und Modell; der Worker prüft alles serverseitig:
 *  - Herkunft (ALLOWED_ORIGINS) und persönliches Zugangstoken (Secret ATELIER_ACCESS_TOKEN)
 *  - Anbieter und Modell nur aus der Freigabeliste ALLOWED_MODELS
 *  - Obergrenzen für Prompt-Länge und Antwort-Tokens
 *  - Tageslimit für Anfragen (Cloudflare KV, Binding ATELIER_KV)
 *  - keine Werkzeuge, keine Funktionsaufrufe, keine Weiterleitung beliebiger Parameter
 *
 * Secrets (im Cloudflare-Dashboard unter Settings > Variables and Secrets als „Secret“ anlegen):
 *   ATELIER_ACCESS_TOKEN, OPENAI_API_KEY, ANTHROPIC_API_KEY, XAI_API_KEY, MISTRAL_API_KEY (nur die benötigten)
 * Variablen: ALLOWED_ORIGINS, ALLOWED_MODELS, MAX_TOKENS, MAX_PROMPT_CHARS, DAILY_CALL_LIMIT, PRICES_PER_MTOK, ALLOWED_VOICES, STT_MODEL
 */

const PROVIDERS = {
  openai: { key: 'OPENAI_API_KEY', call: (env, m, p, t) => openAiLike('https://api.openai.com/v1/chat/completions', env.OPENAI_API_KEY, m, p, t, 'max_completion_tokens') },
  xai: { key: 'XAI_API_KEY', call: (env, m, p, t) => openAiLike('https://api.x.ai/v1/chat/completions', env.XAI_API_KEY, m, p, t, 'max_tokens') },
  mistral: { key: 'MISTRAL_API_KEY', call: (env, m, p, t) => openAiLike('https://api.mistral.ai/v1/chat/completions', env.MISTRAL_API_KEY, m, p, t, 'max_tokens') },
  anthropic: { key: 'ANTHROPIC_API_KEY', call: (env, m, p, t) => anthropic(env.ANTHROPIC_API_KEY, m, p, t) }
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const originOk = allowedOrigins.includes(origin);
    const cors = originOk ? {
      'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Max-Age': '600', Vary: 'Origin'
    } : {};

    if (request.method === 'OPTIONS') return new Response(null, { status: originOk ? 204 : 403, headers: cors });
    if (!originOk) return json({ error: 'Herkunft nicht erlaubt.' }, 403, cors);
    if (!env.ATELIER_ACCESS_TOKEN || !safeEqual(bearer(request), env.ATELIER_ACCESS_TOKEN)) return json({ error: 'Nicht autorisiert.' }, 401, cors);

    const url = new URL(request.url);
    let allowedModels;
    try { allowedModels = JSON.parse(env.ALLOWED_MODELS || '{}'); } catch { return json({ error: 'ALLOWED_MODELS ist kein gültiges JSON.' }, 500, cors); }
    const enabled = Object.keys(PROVIDERS).filter((p) => env[PROVIDERS[p].key] && Array.isArray(allowedModels[p]) && allowedModels[p].length);

    if (url.pathname === '/v1/health' && request.method === 'GET') {
      return json({ ok: true, providers: enabled, limits: { maxTokens: num(env.MAX_TOKENS, 3000), dailyCalls: num(env.DAILY_CALL_LIMIT, 400) }, kv: !!env.ATELIER_KV, limiter: !!env.ATELIER_LIMITER, models: Object.fromEntries(enabled.map(p => [p, allowedModels[p]])), voice: { tts: !!env.XAI_API_KEY, stt: !!env.XAI_API_KEY, voices: String(env.ALLOWED_VOICES || 'eve,leo,rex,ara,sal').split(',').map(v=>v.trim()).filter(Boolean) }, version: 'meeting-room/2.0' }, 200, cors);
    }

    if (url.pathname === '/v1/voices' && request.method === 'GET') {
      if (!env.XAI_API_KEY) return json({ error: 'XAI_API_KEY fehlt.' }, 503, cors);
      try { const r=await fetch('https://api.x.ai/v1/tts/voices', {headers:{Authorization:'Bearer '+env.XAI_API_KEY},signal:AbortSignal.timeout(20000)}); if(!r.ok) throw new Error('Stimmenliste nicht erreichbar.'); const data=await r.json();return json(data,200,cors); } catch {return json({error:'Stimmenliste nicht erreichbar.'},502,cors);}
    }
    if (['/v1/tts','/v1/stt'].includes(url.pathname) && request.method === 'POST') return voiceRequest(request, env, url.pathname, cors);

    if (url.pathname === '/v1/chat' && request.method === 'POST') {
      if (!env.ATELIER_KV && !env.ATELIER_LIMITER) return json({ error: 'Kostenlimits nicht eingerichtet: KV-Binding ATELIER_KV fehlt.' }, 503, cors);
      let body;
      try { body = JSON.parse(await limitedText(request, 80000)); } catch { return json({ error: 'Ungültiger JSON-Body.' }, 400, cors); }
      const { provider, model, prompt } = body || {};
      if (!enabled.includes(provider)) return json({ error: 'Anbieter nicht freigeschaltet.' }, 400, cors);
      if (!allowedModels[provider].includes(model)) return json({ error: 'Modell nicht in der Freigabeliste.' }, 400, cors);
      if (typeof prompt !== 'string' || !prompt.trim()) return json({ error: 'Prompt fehlt.' }, 400, cors);
      if (prompt.length > num(env.MAX_PROMPT_CHARS, 40000)) return json({ error: 'Prompt zu lang.' }, 413, cors);
      const requested=Number(body.maxTokens);
      const maxTokens = Math.floor(Math.min(Math.max(64, Number.isFinite(requested) ? requested : 2200), num(env.MAX_TOKENS, 3000)));
      if(!Number.isFinite(maxTokens))return json({error:'Ungültiges Tokenlimit.'},400,cors);

      const limitError=await reserve(env, cors); if(limitError)return limitError;

      try {
        const r = await PROVIDERS[provider].call(env, model, prompt, maxTokens);
        r.usage.cost = estimate(env, provider, model, r.usage);
        return json({ text: r.text, model, usage: r.usage }, 200, cors);
      } catch (e) {
        return json({ error: 'Anbieterfehler: ' + String(e.message || e).slice(0, 300) }, 502, cors);
      }
    }
    return json({ error: 'Nicht gefunden.' }, 404, cors);
  }
};

async function openAiLike(endpoint, key, model, prompt, maxTokens, tokenField) {
  const payload = { model, messages: [{ role: 'user', content: prompt }] };
  payload[tokenField] = maxTokens;
  const res = await fetch(endpoint, {
    method: 'POST', signal: AbortSignal.timeout(90000),
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data.error && data.error.message) || 'HTTP ' + res.status);
  const text = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
  if(!String(text||'').trim())throw new Error('Leere Modellantwort; Tokenlimit oder Modell prüfen.');
  if(data.choices?.[0]?.finish_reason==='length')throw new Error('Modellantwort abgeschnitten; Tokenlimit erhöhen.');
  const u = data.usage || {};
  return { text: String(text || ''), usage: { input: u.prompt_tokens || 0, output: u.completion_tokens || 0 } };
}

async function anthropic(key, model, prompt, maxTokens) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal: AbortSignal.timeout(90000),
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data.error && data.error.message) || 'HTTP ' + res.status);
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  if(!text.trim())throw new Error('Leere Modellantwort.');
  if(data.stop_reason==='max_tokens')throw new Error('Modellantwort abgeschnitten; Tokenlimit erhöhen.');
  const u = data.usage || {};
  return { text, usage: { input: u.input_tokens || 0, output: u.output_tokens || 0 } };
}

// Kostenschätzung nur, wenn Preise in PRICES_PER_MTOK hinterlegt sind: {"openai:<modell>":[ein, aus]} in USD je 1 Mio. Tokens
function estimate(env, provider, model, usage) {
  try {
    const prices = JSON.parse(env.PRICES_PER_MTOK || '{}')[provider + ':' + model];
    if (!prices) return 0;
    return (usage.input * prices[0] + usage.output * prices[1]) / 1e6;
  } catch { return 0; }
}
function bearer(req) { const h = req.headers.get('Authorization') || ''; return h.startsWith('Bearer ') ? h.slice(7) : ''; }
function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
function num(v, d) { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; }
function json(obj, status, headers) { return new Response(JSON.stringify(obj), { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control':'no-store' }, headers) }); }


// Optional atomic rate limiter. The new wrangler template binds it by default.
// Legacy installations may keep KV: its counter is approximate under concurrent calls.
export class RequestLimiter {
  constructor(ctx, env) { this.ctx=ctx; this.env=env; }
  async fetch(request) {
    const limit=num(this.env.DAILY_CALL_LIMIT,400), day=new Date().toISOString().slice(0,10);
    const accepted=await this.ctx.storage.transaction(async tx=>{
      const record=await tx.get('counter');const used=record?.day===day?record.used:0;
      if(used>=limit)return false;await tx.put('counter',{day,used:used+1});return true;
    });
    return new Response(null,{status:accepted?204:429});
  }
}
async function reserve(env,cors) {
  if(env.ATELIER_LIMITER){const stub=env.ATELIER_LIMITER.get(env.ATELIER_LIMITER.idFromName('daily'));const r=await stub.fetch('https://limiter/reserve',{method:'POST'});return r.ok?null:json({error:'Tageslimit erreicht.'},429,cors);}
  if(!env.ATELIER_KV)return json({error:'Tageslimit nicht eingerichtet: ATELIER_LIMITER oder ATELIER_KV fehlt.'},503,cors);
  const key='calls:'+new Date().toISOString().slice(0,10),used=Number(await env.ATELIER_KV.get(key))||0;
  if(used>=num(env.DAILY_CALL_LIMIT,400))return json({error:'Tageslimit erreicht.'},429,cors);
  await env.ATELIER_KV.put(key,String(used+1),{expirationTtl:172800});return null;
}
async function limitedBytes(request,max) {
  if(Number(request.headers.get('Content-Length'))>max)throw new Error('Anfrage zu groß.');
  const reader=request.body?.getReader();if(!reader)return new Uint8Array();const chunks=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new Error('Anfrage zu groß.');}chunks.push(value);}
  const out=new Uint8Array(size);let offset=0;for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.length;}return out;
}
async function limitedText(request,max){return new TextDecoder().decode(await limitedBytes(request,max));}
async function voiceRequest(request,env,path,cors){
  if(!env.XAI_API_KEY)return json({error:'XAI_API_KEY fehlt.'},503,cors);
  let payload;
  try {
    if(path==='/v1/tts'){
      const body=JSON.parse(await limitedText(request,40000));
      if(typeof body.text!=='string'||!body.text.trim()||body.text.length>8000)return json({error:'Sprachtext muss 1–8000 Zeichen lang sein.'},400,cors);
      const voices=String(env.ALLOWED_VOICES||'eve,leo,rex,ara,sal').split(',').map(v=>v.trim());
      if(!voices.includes(body.voice))return json({error:'Stimme nicht freigeschaltet.'},400,cors);
      if(!['de','fr','en'].includes(body.language))return json({error:'Sprache nicht freigeschaltet.'},400,cors);
      payload=JSON.stringify({text:body.text,voice_id:body.voice,language:body.language});
    }else{
      const bytes=await limitedBytes(request,8*1024*1024);
      const form=await new Response(bytes,{headers:{'Content-Type':request.headers.get('Content-Type')||''}}).formData();
      const file=form.get('file'),language=form.get('language');
      if(!(file instanceof Blob)||!file.size||!/^audio\/(webm|mp4|ogg|mpeg|wav|x-wav)/.test(file.type))return json({error:'Audio-Datei fehlt oder Format nicht unterstützt.'},400,cors);
      if(!['de','fr','en'].includes(language))return json({error:'Sprache nicht freigeschaltet.'},400,cors);
      payload=new FormData();payload.append('file',file,typeof file.name==='string'?file.name:'question.webm');payload.append('language',language);payload.append('model',String(env.STT_MODEL||'grok-voice-transcribe-2.0'));payload.append('format','true');
    }
  }catch(e){return json({error:e.message==='Anfrage zu groß.'?e.message:'Ungültige Sprach-Anfrage.'},400,cors);}
  const blocked=await reserve(env,cors);if(blocked)return blocked;
  try {
    const headers={Authorization:'Bearer '+env.XAI_API_KEY};if(path==='/v1/tts')headers['Content-Type']='application/json';
    const r=await fetch('https://api.x.ai'+path,{method:'POST',headers,body:payload,signal:AbortSignal.timeout(90000)});
    if(!r.ok)return json({error:'xAI-Sprachdienst: HTTP '+r.status},502,cors);
    if(path==='/v1/stt'){const data=await r.json();return json({text:String(data.text||'')},200,cors);}
    return new Response(r.body,{headers:{...cors,'Content-Type':'audio/mpeg','Cache-Control':'no-store'}});
  }catch{return json({error:'xAI-Sprachdienst nicht erreichbar oder Zeitüberschreitung.'},502,cors);}
}
