// Local ringback, no asset download and no API request. Uses the gesture-unlocked audio context.
export class Ringback {
  constructor(getContext,{schedule=(fn,ms)=>globalThis.setTimeout(fn,ms),cancel=id=>globalThis.clearTimeout(id)}={}){this.getContext=getContext;this.schedule=schedule;this.cancel=cancel;this.timer=null;this.voices=new Set();this.running=false;}
  start(){
    this.stop();const context=this.getContext();if(!context||context.state!=='running')return;
    this.running=true;let cycles=0;
    const pulse=()=>{
      if(!this.running||context.state!=='running'||cycles++>=20){this.stop();return;}
      const oscillator=context.createOscillator(),gain=context.createGain(),now=context.currentTime;
      oscillator.type='sine';oscillator.frequency.value=425;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.055,now+.025);gain.gain.setValueAtTime(.055,now+.9);gain.gain.linearRampToValueAtTime(0,now+1);
      oscillator.connect(gain);gain.connect(context.destination);const voice={oscillator,gain};this.voices.add(voice);
      oscillator.onended=()=>{this.voices.delete(voice);oscillator.disconnect();gain.disconnect();};oscillator.start(now);oscillator.stop(now+1.02);this.timer=this.schedule(pulse,4000);
    };pulse();
  }
  stop(){this.running=false;if(this.timer!==null)this.cancel(this.timer);this.timer=null;for(const {oscillator,gain} of this.voices){oscillator.onended=null;try{oscillator.stop();}catch{}oscillator.disconnect();gain.disconnect();}this.voices.clear();}
}
