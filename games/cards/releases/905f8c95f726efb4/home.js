'use strict';
(() => {
  const titles={hearts:'Hearts',euchre:'Euchre'};
  function progress() {
    let last;try{last=localStorage.getItem(CardSuite.lastKey);}catch{}
    const states={};
    for(const id of CardProgress.ids){
      states[id]=CardProgress.read(id).state;
      const action=states[id]==='saved'?'Continue':states[id]==='damaged'?'Review saved game':states[id]==='unavailable'?'Check saved game':'Play';
      document.getElementById(id+'-state').textContent=action+(['Play','Continue'].includes(action)?' '+titles[id]:'');
    }
    const button=document.getElementById('continue-game');
    button.hidden=states[last]!=='saved';
    if(!button.hidden){button.href=CardSuite.base+last+'/';document.getElementById('continue-title').textContent='Continue '+titles[last];}
  }
  function offline(){
    const state=CardSuite.offlineState, status=document.getElementById('offline-status');
    status.dataset.state=state;
    status.textContent=({ready:'Ready offline',checking:'Checking offline play…',downloading:'Downloading both games…',failed:'Offline copy is incomplete'})[state];
    document.getElementById('offline-detail').textContent=state==='ready'?'Hearts and Euchre are saved on this device.':state==='failed'?'Connect to the internet and try the download again.':'You can play while the download finishes.';
    document.getElementById('retry-offline').hidden=state!=='failed';
    document.getElementById('update-status').hidden=!CardSuite.waiting;
  }
  HeartsTouch.install(document.querySelector('.home'),()=>[location.pathname],{selector:'.game-choice,#continue-game,#retry-offline',unavailable:()=>false,consumeOutsideClick:true});
  document.querySelectorAll('.game-choice,#continue-game').forEach(link=>link.addEventListener('click',event=>{
    if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();CardSuite.navigate(link.href);
  }));
  document.getElementById('retry-offline').addEventListener('click',()=>CardSuite.retry());
  window.addEventListener('suite-offline-change',offline);
  window.addEventListener('storage',progress);window.addEventListener('pageshow',progress);
  progress();offline();
})();
