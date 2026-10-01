'use strict';
window.CardSuite = (() => {
  const base = document.querySelector('meta[name="card-suite-root"]').content;
  const build = document.querySelector('meta[name="card-suite-release"]').content;
  const lastKey = 'card-suite:pilot:last-played:v1';
  const arrivalKey = 'card-suite:pilot:navigation-press';
  let registration, checkPromise, adapter = null, paused = false, offlineReady = false, offlineState = 'checking';
  let statusDetail = '', touch;
  let arriving = false;
  try { arriving = sessionStorage.getItem(arrivalKey)==='1';sessionStorage.removeItem(arrivalKey); } catch {}
  document.addEventListener('pointerdown',()=>{arriving=false;},true);
  document.addEventListener('click',event=>{
    if(arriving&&event.detail>0){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  function navigate(url) {
    try { sessionStorage.setItem(arrivalKey,'1'); } catch {}
    location.assign(url);
  }
  function reload() {
    try { sessionStorage.setItem(arrivalKey,'1'); } catch {}
    location.reload();
  }
  const words = {
    en:{home:'All games',failed:'Your latest changes could not be saved.',detail:'Stay at the table to keep playing, or leave without saving those changes.',stay:'Stay at the table',leave:'Leave without saving'},
    es:{home:'Todos los juegos',failed:'No se pudieron guardar los últimos cambios.',detail:'Quédate en la mesa o sal sin guardar esos cambios.',stay:'Quedarme en la mesa',leave:'Salir sin guardar'},
    vi:{home:'Tất cả trò chơi',failed:'Không thể lưu các thay đổi mới nhất.',detail:'Ở lại bàn để chơi tiếp hoặc rời đi mà không lưu các thay đổi này.',stay:'Ở lại bàn',leave:'Rời đi không lưu'}
  };
  function dialog() {
    let node=document.getElementById('suite-dialog');
    if (!node) {
      node=document.createElement('dialog');node.id='suite-dialog';node.setAttribute('aria-labelledby','suite-dialog-title');
      node.innerHTML='<h2 id="suite-dialog-title" tabindex="-1"></h2><p id="suite-dialog-detail"></p><div class="suite-dialog-actions"></div>';
      document.body.append(node);
      // Games already have their own document touch listeners. Restrict this one
      // to the new recovery dialog; no controls activate while another owns it.
      if (typeof HeartsTouch !== 'undefined') touch=HeartsTouch.install(node,()=>[paused,adapter],{selector:'#suite-dialog button',unavailable:()=>!node.open,consumeOutsideClick:true});
      node.addEventListener('close',()=>touch?.cancel());
    }
    return node;
  }
  function prompt(title,detail,buttons,onCancel) {
    const node=dialog();
    node.querySelector('h2').textContent=title;node.querySelector('p').textContent=detail;
    const actions=node.querySelector('.suite-dialog-actions');actions.replaceChildren();
    for (const {id,label,action} of buttons) {
      const button=document.createElement('button');button.id=id;button.textContent=label;
      button.addEventListener('click',()=>{node.close();action();},{once:true});actions.append(button);
    }
    node.oncancel=event=>{event.preventDefault();if(onCancel){node.close();onCancel();}};
    if (!node.open) node.showModal();node.querySelector('h2').focus();
  }
  function allowStart(id) {
    const data=CardProgress.read(id);
    if(data.state==='unavailable'){
      paused=true;
      prompt('Your saved progress cannot be read','This browser is not allowing access to saved games. Try again before starting, so an existing game is not replaced.',[
        {id:'suite-retry',label:'Try again',action:reload},
        {id:'suite-stay',label:'All games',action:()=>navigate(base)}
      ],()=>navigate(base));
      return false;
    }
    if (data.state!=='damaged') return true;
    paused=true;
    prompt('This saved game needs attention','Neither saved copy could be read. You can return to All games, or explicitly start a new practice game.',[
      {id:'suite-stay',label:'All games',action:()=>navigate(base)},
      {id:'suite-reset',label:'Start a new practice game',action:()=>{
        try { const key=CardProgress.keys(id).game;localStorage.removeItem(key);localStorage.removeItem(key+'-backup');reload(); }
        catch { prompt('The saved game could not be cleared','This browser is not allowing changes to saved data.',[{id:'suite-stay',label:'All games',action:()=>navigate(base)}]); }
      }}
    ],()=>navigate(base));
    return false;
  }
  function save(id,value,settings) {
    if (!CardProgress.valid(id,value)) return false;
    try {
      const key=CardProgress.keys(id), body=JSON.stringify(value), prefs=JSON.stringify(settings);
      const old=localStorage.getItem(key.game);
      let oldValid=false;
      if(old){try{oldValid=CardProgress.valid(id,JSON.parse(old));}catch{}}
      if(oldValid)localStorage.setItem(key.game+'-backup',old);
      localStorage.setItem(key.settings,prefs);
      localStorage.setItem(key.game,body);
      if(localStorage.getItem(key.game)!==body||localStorage.getItem(key.settings)!==prefs)throw new Error('Save verification failed');
      // Last-played is optional navigation metadata; game data is authoritative.
      try { localStorage.setItem(lastKey,id); } catch {}
      return true;
    } catch { return false; }
  }
  function attach(value) { adapter=value; }
  function leave() {
    if (!adapter||paused) return;
    paused=true;adapter.pause();
    if (adapter.save()) { navigate(base);return; }
    const text=words[adapter.language?.()]||words.en;
    const resume=()=>{paused=false;adapter.resume();document.getElementById('all-games')?.focus();};
    prompt(text.failed,text.detail,[{id:'suite-stay',label:text.stay,action:resume},{id:'suite-leave',label:text.leave,action:()=>navigate(base)}],resume);
  }
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-suite-home]')){event.preventDefault();event.stopImmediatePropagation();leave();}
  });
  // A back/forward-cache restore must not retain the navigation pause forever.
  window.addEventListener('pageshow',event=>{if(event.persisted&&adapter){paused=false;adapter.resume();}});
  function setStatus(state,detail='') {
    offlineState=state;offlineReady=state==='ready';statusDetail=detail;
    window.dispatchEvent(new CustomEvent('suite-offline-change',{detail:{state,ready:offlineReady,detail,waiting:Boolean(registration?.waiting)}}));
  }
  function ask(worker,type) {
    return new Promise((resolve,reject)=>{
      const channel=new MessageChannel();const timeout=setTimeout(()=>reject(new Error('Offline check timed out')),25000);
      channel.port1.onmessage=event=>{clearTimeout(timeout);channel.port1.close();resolve(event.data);};
      worker.postMessage({type},[channel.port2]);
    });
  }
  async function check(repair=false) {
    if (checkPromise) return checkPromise;
    checkPromise=(async()=>{
      setStatus(repair?'downloading':'checking');
      try {
        if(!registration?.active)throw new Error('Offline preparation has not finished');
        let result=await ask(registration.active,repair?'REPAIR_OFFLINE':'CHECK_OFFLINE');
        if(!result.ready&&!repair&&navigator.onLine)result=await ask(registration.active,'REPAIR_OFFLINE');
        if(!result.ready)throw new Error(result.error||'Some files are unavailable');
        setStatus('ready');
      } catch(error){setStatus('failed',error.message);}
    })().finally(()=>{checkPromise=null;});
    return checkPromise;
  }
  async function startOffline() {
    if(!('serviceWorker' in navigator)||!isSecureContext){setStatus('failed','Use localhost or HTTPS to prepare offline play.');return;}
    try {
      setStatus('downloading');
      registration=await navigator.serviceWorker.register(base+'service-worker.js',{scope:base,updateViaCache:'none'});
      const observe=worker=>worker?.addEventListener('statechange',()=>{
        if(worker.state==='activated')check();
        if(worker.state==='installed')setStatus(offlineState,statusDetail);
        if(worker.state==='redundant'&&!registration.active)setStatus('failed','Download interrupted. Try again online.');
      });
      registration.addEventListener('updatefound',()=>observe(registration.installing));observe(registration.installing);
      if(registration.active)await check();
      else {
        // Bounded wait instead of assuming ready implies a complete cache.
        await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Offline preparation timed out')),25000))]);
        await check();
      }
    } catch(error){setStatus('failed',error.message);}
  }
  window.addEventListener('online',()=>check(true));
  window.addEventListener('offline',()=>check());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
  const api={allowStart,save,attach,leave,navigate,check,retry:async()=>{if(!registration?.active)await startOffline();else await check(true);},base,build,lastKey,
    get adapter(){return adapter;},get paused(){return paused;},get offlineReady(){return offlineReady;},get offlineState(){return offlineState;},get waiting(){return Boolean(registration?.waiting);}};
  // Apps attach synchronously first; readiness runs independently of gameplay.
  queueMicrotask(startOffline);
  return api;
})();
