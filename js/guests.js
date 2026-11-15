// Remote guests never occupy a team seat or join rounds automatically.
// Add a portrait and a real, Worker-approved model before enabling another guest.
export const REMOTE_GUESTS = [
  {id:'gem',name:'Gem',provider:'google',model:'gemini-3.8-flash',voice:'leo',image:'assets/gem.png',role:'Structure Visionary & Bridge Builder',enabled:true},
  {id:'mika',name:'Mika',provider:'',model:'',voice:'',image:'',role:'',enabled:false},
  {id:'ani',name:'Ani',provider:'',model:'',voice:'',image:'',role:'',enabled:false}
];
export function findGuest(config,id){return (config.remoteGuests||REMOTE_GUESTS).find(g=>g.id===id);}
export const CALL_WORDS={
  de:{lead:n=>`Ich rufe ${n} dazu.`,bye:n=>`Danke, ${n}. Bis zum nächsten Mal!`,closed:'Anruf beendet. Wir hören zu.'},
  fr:{lead:n=>`J’appelle ${n} pour nous rejoindre.`,bye:n=>`Merci, ${n}. À bientôt !`,closed:'Appel terminé. Nous vous écoutons.'},
  en:{lead:n=>`I’ll call ${n} to join us.`,bye:n=>`Thanks, ${n}. See you next time!`,closed:'Call ended. We’re listening.'}
};
