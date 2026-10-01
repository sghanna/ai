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
    // The disk matches the favicon's circle exactly, so the final seal stays put.
    return `<svg viewBox="0 0 512 512" aria-hidden="true"><defs><radialGradient id="${id}" cx="40%" cy="35%" r="65%"><stop stop-color="#fffef2"/><stop offset=".6" stop-color="#f6e5ae"/><stop offset="1" stop-color="#d7b968"/></radialGradient></defs><circle cx="256" cy="256" r="194" fill="url(#${id})"/><g fill="#b59c60" opacity=".27"><circle cx="185" cy="181" r="34"/><circle cx="314" cy="164" r="19"/><circle cx="337" cy="297" r="40"/><circle cx="369" cy="220" r="13"/><circle cx="202" cy="337" r="23"/></g></svg>`;
  }
  // Exact heart outline and placement from icons/icon.svg. Each landing heart
  // reveals one adjoining region; together those regions form the whole mark.
  const logoHeart = 'M50 93C39 82 4 58 4 32C4 7 35 1 50 24C65 1 96 7 96 32C96 58 61 82 50 93Z';
  const landings = [[196,174],[316,174],[160,218],[224,218],[288,218],[352,218],[191,264],[256,264],[321,264],[223,308],[289,308],[244,340],[268,340]];
  function landingRegion(index) {
    const [x,y]=landings[index];
    let polygon=[[0,0],[512,0],[512,512],[0,512]];
    for(const [otherIndex,[ox,oy]] of landings.entries()) {
      if(index===otherIndex)continue;
      // Tiny overlap removes antialias seams when adjacent regions meet.
      const dx=ox-x,dy=oy-y,edge=(ox*ox+oy*oy-x*x-y*y)/2+Math.hypot(dx,dy);
      const distance=([px,py])=>px*dx+py*dy-edge;
      const clipped=[];
      for(let i=0;i<polygon.length;i++) {
        const a=polygon[i],b=polygon[(i+1)%polygon.length],da=distance(a),db=distance(b);
        if(da<=0)clipped.push(a);
        if((da<=0)!==(db<=0)) {
          const t=da/(da-db);clipped.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);
        }
      }
      polygon=clipped;
    }
    return polygon.map(p=>p.join(',')).join(' ');
  }
  function drawMoon(w,h,motion) {
    const size=Math.min(430,w*.86,h*.94),cx=w/2,cy=h/2,left=cx-size/2,top=cy-size/2;
    const logo=()=>piece('<img src="/ai/games/cards/releases/905f8c95f726efb4/hearts/icons/icon.svg" alt="" draggable="false">','celebration-logo',left,top,size);
    if(!motion) { logo();return; }
    const queenWidth=Math.min(240,w*.52,h*.55);
    const queen=piece(cardSVG('Q','S'),'celebration-queen moon-queen',cx-queenWidth/2,cy-queenWidth*.75,queenWidth);
    queen.dataset.card='QS';
    // AGY suggested a single edge-on handoff instead of ghosted silhouettes.
    // Two turns slow naturally into the flip; both faces share its final axis.
    const spinMs=1560,flipMs=300,queenFrames=[],moonFrames=[];
    for(let step=0;step<=78;step++) {
      const p=step/78,t=p*spinMs,flip=Math.max(0,(t-(spinMs-flipMs))/flipMs);
      // Project the flip to 2D so WebKit paints the same edge that layout reports.
      queenFrames.push({offset:p,transform:`rotate(${720*(2*p-p*p)}deg) scaleX(${Math.cos(Math.PI/2*flip*flip)})`});
    }
    for(let step=0;step<=30;step++) {
      const p=step/30;
      moonFrames.push({offset:p,transform:`scaleX(${Math.sin(Math.PI/2*(2*p-p*p))})`});
    }
    animate(queen,queenFrames,{duration:spinMs,easing:'linear'});
    // Swap only at the narrow edge. No translucent card lies over the moon.
    animate(queen,[{opacity:1,easing:'steps(1,end)'},{opacity:0}],{duration:spinMs});
    const orb=piece(moon(),'celebration-moon',left,top,size);
    animate(orb,moonFrames,{delay:spinMs,duration:flipMs,easing:'linear'});
    animate(orb,[{opacity:0,easing:'steps(1,end)'},{opacity:1}],{duration:spinMs});
    const regions=landings.map((_,i)=>`<clipPath id="landing-${serial}-${i}"><polygon points="${landingRegion(i)}"/></clipPath>`).join('');
    const patches=landings.map((_,i)=>`<g class="moon-heart-tile" clip-path="url(#landing-${serial}-${i})"><path d="${logoHeart}" transform="translate(116 105) scale(2.8)" fill="#961c18"/></g>`).join('');
    const mark=piece(`<svg viewBox="0 0 512 512" aria-hidden="true"><defs>${regions}</defs>${patches}</svg>`,'celebration-heartmark',left,top,size);
    const tiles=mark.querySelectorAll('.moon-heart-tile');
    const width=Math.min(82,w*.19,h*.30),rx=(w-width)/2-10,ry=(h-width)/2-10;
    for(let i=0;i<13;i++) {
      const delay=1980+i*130,duration=2200;
      const target={x:left+landings[i][0]*size/512,y:top+landings[i][1]*size/512};
      const el=piece(heart,'celebration-heart',0,0,width),frames=[];
      for(let step=0;step<=64;step++) {
        const t=step/64,p=t*t*(3-2*t),angle=i*Math.PI*2/13-Math.PI/2+p*Math.PI*2.2;
        const x=cx+Math.cos(angle)*rx*(1-p)+(target.x-cx)*p;
        const y=cy+Math.sin(angle)*ry*(1-p)+(target.y-cy)*p;
        frames.push({offset:t,transform:`translate(${x-width/2}px,${y-width/2}px) scale(${1-.58*p}) rotate(${Math.sin(p*Math.PI*2)*16}deg)`,opacity:t<.07?t/.07:t>.92?(1-t)/.08:1});
      }
      animate(el,frames,{delay,duration,easing:'linear'});
      animate(tiles[i],[{opacity:0},{opacity:1}],{delay:delay+duration-180,duration:360,easing:'ease-out'});
    }
    // Hold the assembled heart before the moon resolves into the exact favicon.
    animate(logo(),[{opacity:0},{opacity:1}],{delay:6130,duration:650,easing:'ease-in-out'});
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
      const baseSize = Math.min(86,Math.max(38,w/(n+2)));
      if(!current.lanterns) {
        const shuffled=()=>{
          const order=Array.from({length:n},(_,i)=>i);
          for(let i=n-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]]; }
          return order;
        };
        const sizes=shuffled(),speeds=shuffled();
        // Shuffle independent size/speed ranges so every celebration has variety.
        // Keep the choices when Reduced Motion redraws the same scene.
        current.lanterns=sizes.map((rank,i)=>({
          scale:.68+.74*(rank+Math.random())/n,
          duration:2200+1600*(speeds[i]+Math.random())/n,
          delay:Math.random()*500,y:.08+Math.random()*.84,sway:Math.random()*2-1
        }));
      }
      for(let i=0;i<n;i++) {
        const choice=current.lanterns[i],size=Math.min(116,baseSize*choice.scale,h*.52);
        const margin=Math.min(16,w*.025)+4;
        const x = Math.max(margin,Math.min(w-size-margin,(i+.5)*w/n-size/2));
        const y = Math.max(0,h-size*88/60)*choice.y;
        const el = piece(lantern(i),'celebration-lantern',x,y,size);
        const sway = choice.sway*Math.min(16,w*.025);
        animate(el,[
          {transform:`translateY(${h-y+size}px) rotate(-3deg)`,opacity:0},
          {opacity:1,offset:.16},
          {transform:`translate(${sway}px,${-y-size*1.7}px) rotate(3deg)`,opacity:1,offset:.86},
          {transform:`translate(0,${-y-size*2}px) rotate(0deg)`,opacity:0}
        ],{duration:choice.duration,delay:choice.delay,easing:'linear'});
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
      drawMoon(w,h,motion);
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
    current={kind,motion,onFinish,animations:[],held:new Set(),remaining:motion ? ({clean:3000,moon:8200,win:4600}[kind]) : 1800,started:null,timer:null};
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
