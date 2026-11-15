import {MEMBERS} from './engine.js';
// Frank's non-secret defaults. Never put tokens or provider API keys in this file.
export function defaultConfig(){return {
  workerUrl:'https://atelier-team-api.letzbug.workers.dev',topic:'',language:'de',
  rounds:3,autoRounds:true,maxCalls:100,audioMode:'xai',rate:1,
  speaker:'host',hostName:'Frank',guestName:'Gast',showGuest:false,subtitles:false,autoSend:true,
  participants:structuredClone(MEMBERS)
};}
