/* Responsive celebrations for Hearts.
   Lantern and moon artwork adapted from Shawn's Claude Hearts (hearts/fx.js,
   sghanna/claude, d6b331fd488c3e7ebdac173eea252f1da0ffcd39).
   Layout, lifecycle, and integration rebuilt for this game's tablet/phone UI. */
'use strict';
const HeartsCelebration = (() => {
  const dialog = document.getElementById('celebration-dialog');
  const scene = document.getElementById('celebration-scene');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = null, serial = 0;
  const heart = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 35C15 30 2 22 2 12 2 1 16 0 20 9 24 0 38 1 38 12 38 22 25 30 20 35Z" fill="#e95754" stroke="#ffc6a0" stroke-width="1.2"/></svg>';
  const star = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 0 12.2 7.8 20 10 12.2 12.2 10 20 7.8 12.2 0 10 7.8 7.8Z" fill="#ffe7ab"/></svg>';
  function lantern(index) {
    const id = `lantern-${serial}-${index}`;
    const symbols = ['福','和','吉','春','寿','禄','龍','财','旺'];
    return `<svg viewBox="0 0 60 88" aria-hidden="true"><defs><radialGradient id="${id}" cx="50%" cy="43%" r="60%"><stop stop-color="#fff0b7"/><stop offset=".46" stop-color="#ef6940"/><stop offset="1" stop-color="#a52922"/></radialGradient></defs><path d="M25 8V3h10v5" fill="#edbd65"/><ellipse cx="30" cy="42" rx="26" ry="33" fill="url(#${id})"/><path d="M12 16h36M12 68h36" stroke="#fbd483" stroke-width="5" stroke-linecap="round"/><path d="M30 72v13m-5-6 5 6 5-6" stroke="#fbd483" stroke-width="2" fill="none"/><text x="30" y="51" text-anchor="middle" font-size="24" font-weight="700" fill="#fff1be" font-family="PingFang SC,Hiragino Sans,sans-serif">${symbols[index]}</text></svg>`;
  }
  function moon() {
    const id = `moon-${serial}`;
    return `<svg viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="${id}" cx="40%" cy="35%" r="65%"><stop stop-color="#fffef2"/><stop offset=".6" stop-color="#f6e5ae"/><stop offset="1" stop-color="#d7b968"/></radialGradient></defs><circle cx="100" cy="100" r="91" fill="url(#${id})"/><g fill="#b59c60" opacity=".27"><circle cx="67" cy="65" r="16"/><circle cx="127" cy="57" r="9"/><circle cx="138" cy="119" r="19"/><circle cx="153" cy="83" r="6"/><path d="M72 148c-9-8-21-15-21-25 0-12 16-14 21-4 6-10 22-8 22 4 0 10-13 18-22 25Z"/></g></svg>`;
  }
  function piece(html, className, x, y, width) {
    const el = document.createElement('div');
    el.className = `celebration-piece ${className}`;
    el.innerHTML = html;
    Object.assign(el.style,{left:`${x}px`,top:`${y}px`,width:`${width}px`});
    scene.append(el);
    return el;
  }
  function animate(el, frames, options) {
    if (!current.motion) return;
    current.animations.push(el.animate(frames,{fill:'both',...options}));
  }
  function draw() {
    scene.replaceChildren();
    const {width:w,height:h} = scene.getBoundingClientRect();
    const {kind,motion} = current;
    scene.dataset.motion = motion ? 'on' : 'off';
    // Deterministic positions make the composition balanced at every size.
    for (let i=0;i<15;i++) {
      const x = (0.06 + ((i*37)%87)/100)*w, y = (0.06 + ((i*23)%66)/100)*h;
      const el = piece(star,'celebration-star',x,y, i%3===0 ? 9 : 5);
      animate(el,[{opacity:.15},{opacity:.7},{opacity:.3}],{duration:3400,delay:i*30});
    }
    if (kind === 'win') {
      const n = w<500 ? 7 : 9;
      const size = Math.min(86,Math.max(38,w/(n+2)));
      for(let i=0;i<n;i++) {
        const x = (i+.5)*w/n-size/2;
        const y = h*(.22+((i*17)%49)/100);
        const el = piece(lantern(i),'celebration-lantern',x,y,size);
        const sway = (i%2 ? 1 : -1)*Math.min(16,w*.025);
        animate(el,[
          {transform:`translateY(${h-y+size}px) rotate(-3deg)`,opacity:0},
          {opacity:1,offset:.16},
          {transform:`translate(${sway}px,${-y-size*1.7}px) rotate(3deg)`,opacity:1,offset:.86},
          {transform:`translate(0,${-y-size*2}px) rotate(0deg)`,opacity:0}
        ],{duration:3800,delay:i*80,easing:'linear'});
      }
    } else if (kind === 'clean') {
      const n = 5, size = Math.min(106,Math.max(50,w*.17),h*.42);
      for(let i=0;i<n;i++) {
        const x = w*(.1+i*.19)-size/2, y = h*(.35+(i%2)*.13);
        const el = piece(cardSVG(['A','3','7','10','K'][i],'H'),'celebration-card',x,y,size);
        const tilt = (i-2)*8;
        el.style.transform = `rotate(${tilt}deg)`;
        animate(el,[
          {transform:`translateY(${h-y+size}px) rotate(${tilt-12}deg)`,opacity:0},
          {transform:`translateY(0) rotate(${tilt}deg)`,opacity:1,offset:.42},
          {transform:`translateY(-${Math.min(70,h*.22)}px) rotate(${tilt+5}deg)`,opacity:1,offset:.83},
          {transform:`translateY(-${Math.min(95,h*.3)}px) rotate(${tilt+5}deg)`,opacity:0}
        ],{duration:2400,delay:i*95,easing:'ease-out'});
      }
    } else {
      const size = Math.min(230,w*.49,h*.49), mx = w/2, my = h*.3;
      const orb = piece(moon(),'celebration-moon',mx-size/2,my-size/2,size);
      animate(orb,[{transform:'scale(.7)',opacity:0},{transform:'scale(1)',opacity:1,offset:.18},{transform:'scale(1)',opacity:1,offset:.82},{opacity:0}],{duration:4400,easing:'ease-out'});
      for(let i=0;i<14;i++) {
        const queen = i===13, row = i<7 ? 0 : 1, col = i%7;
        const width = queen ? Math.min(44,w*.105) : Math.min(32,w*.072);
        const height = queen ? width*1.5 : width;
        const x = w*(.12+col*.12)-width/2, y = h*(.65+row*.17)-height/2;
        const el = piece(queen ? cardSVG('Q','S') : heart,queen ? 'celebration-queen' : 'celebration-heart',x,y,width);
        const dx = mx-x-width/2, dy = my-y-height/2;
        animate(el,[{opacity:0,transform:'none'},{opacity:1,transform:'none',offset:.14},{opacity:1,offset:.5},{transform:`translate(${dx}px,${dy}px) scale(.15)`,opacity:0}],{duration:2100,delay:600+i*95,easing:'cubic-bezier(.45,0,.25,1)'});
      }
    }
  }
  function pause() {
    if (!current) return;
    clearTimeout(current.timer);
    if(current.started!==null) current.remaining=Math.max(0,current.remaining-(performance.now()-current.started));
    current.started=null;
    current.animations.forEach(a=>{if(a.playState==='running')a.pause();});
  }
  function resume() {
    if(!current || document.hidden || current.held.size || current.started!==null) return;
    current.animations.forEach(a=>{if(a.playState==='paused')a.play();});
    current.started=performance.now();
    current.timer=setTimeout(finish,current.remaining);
  }
  function finish() {
    if(!current)return;
    const old=current;current=null;
    clearTimeout(old.timer);
    old.animations.forEach(a=>a.cancel());
    scene.replaceChildren();
    if(dialog.open)dialog.close();
    old.onFinish?.();
  }
  function show({kind,title,detail,onFinish}) {
    finish();serial++;
    document.getElementById('celebration-title').textContent=title;
    document.getElementById('celebration-detail').textContent=detail;
    dialog.dataset.kind=kind;
    const motion=!reduced.matches && typeof Element.prototype.animate==='function';
    current={kind,motion,onFinish,animations:[],held:new Set(),remaining:motion ? (kind==='clean'?3000:4600) : 1800,started:null,timer:null};
    dialog.showModal();draw();resume();
    document.getElementById('celebration-skip').focus({preventScroll:true});
  }
  document.getElementById('celebration-skip').addEventListener('click',finish);
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});
  dialog.addEventListener('close',()=>{if(!dialog.open)finish();});
  // Keep the scene in place while any finger is still down, including a miss
  // beside the button, so a timed close cannot expose the next screen mid-press.
  document.addEventListener('pointerdown',event=>{
    if(current && dialog.contains(event.target)) {
      current.held.add(event.pointerId);pause();
    }
  },true);
  for(const type of ['pointerup','pointercancel','lostpointercapture']) {
    document.addEventListener(type,event=>{
      if(current?.held.delete(event.pointerId))resume();
    },true);
  }
  window.addEventListener('blur',()=>{if(current){current.held.clear();resume();}});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden) { if(current)current.held.clear();pause(); }
    else resume();
  });
  window.addEventListener('pagehide',finish);
  // Rotation finishes the scene rather than replaying stale pixel trajectories.
  window.addEventListener('resize',finish);
  reduced.addEventListener('change',()=>{
    if(!current || !reduced.matches)return;
    pause();current.animations.forEach(a=>a.cancel());current.animations=[];
    current.motion=false;current.remaining=1800;draw();resume();
  });
  return {show,finish};
})();
