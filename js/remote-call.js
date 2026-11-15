// Compact call card above the avatar mounts; never resize the full-screen room.
export class RemoteCallView {
  constructor(meeting,root=document){
    this.panel=root.getElementById('remoteCall');this.main=root.querySelector('main');
    this.name=root.getElementById('callName');this.image=root.getElementById('callPortrait');
    this.status=root.getElementById('callStatus');this.role=root.getElementById('callRole');
    this.panel.querySelector('button').addEventListener('click',()=>meeting.hangup());
    meeting.addEventListener('call',e=>this.render(e.detail.state));
    meeting.addEventListener('speaker',e=>{this.panel.dataset.speaking=String(!!this.guest&&e.detail.id===this.guest.id);});
    this.render(null);
  }
  render(state){
    this.guest=state?.guest||null;this.panel.hidden=!state;this.main.dataset.callActive=String(!!state);
    this.panel.dataset.speaking='false';this.panel.dataset.state=state?.status||'';
    if(!state){this.image.removeAttribute('src');return;}
    this.name.textContent=state.guest.name;this.role.textContent=state.guest.role;
    this.image.src=state.guest.image;this.image.alt=state.guest.name+' · KI-Gast';
    this.status.textContent=state.status==='connected'?'Remote Guest connected':`Calling ${state.guest.name}…`;
  }
}
