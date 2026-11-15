// Renderer contract for future Live2D/GLB assets. No avatar runtime is assumed or bundled.
// Register once: window.AtelierAvatars.register('cameron', { speaking(bool), mouth(0..1), hand(bool), destroy() }).
export class Avatars {
  constructor(members){this.adapters=new Map();this.states=new Map();this.root=document.getElementById('avatars');this.members=members;
    for(const m of members){const node=document.createElement('div');node.className='avatar';node.dataset.id=m.id;node.style.setProperty('--x',m.x+'%');node.style.setProperty('--c',m.color);this.root.append(node);this.states.set(m.id,{speaking:false,mouth:0,hand:false,node});}
    window.AtelierAvatars={register:(id,adapter)=>this.register(id,adapter),mount:id=>this.states.get(id)?.node};
  }
  register(id,adapter){const s=this.states.get(id);if(!s)throw new Error('Unbekannter Sitz');this.adapters.get(id)?.destroy?.();this.adapters.set(id,adapter);adapter.speaking?.(s.speaking);adapter.mouth?.(s.mouth);adapter.hand?.(s.hand);}
  speaking(id){const ids=Array.isArray(id)?id:[id];for(const [key,s] of this.states){s.speaking=ids.includes(key);s.node.dataset.speaking=String(s.speaking);this.adapters.get(key)?.speaking?.(s.speaking);}}
  mouth(id,value){if(!id){for(const key of this.states.keys())this.mouth(key,0);return;}const s=this.states.get(id);if(s){s.mouth=value;this.adapters.get(id)?.mouth?.(value);}}
  hands(items){for(const [id,s] of this.states){s.hand=items.some(h=>h.id===id);this.adapters.get(id)?.hand?.(s.hand);}}
  reset(){this.speaking(null);this.mouth(null,0);this.hands([]);}
}
