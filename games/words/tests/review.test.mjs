// Regression checks for the September 30 review. Start a server, then npm run test:review.
import assert from 'node:assert/strict';
import { webkit, chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.argv[2] || 'http://127.0.0.1:8774/';
const out = new URL('../output/playwright/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }
for (const [name, engine] of Object.entries({webkit,chromium})) {
 const b = await engine.launch();
 try {
  const p = await b.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce',serviceWorkers:'block'});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  async function fresh(level=1, extra='') {await p.goto(`${BASE}?level=${level}&fresh=1${extra}`);await p.waitForFunction(()=>window.__wordwheelReady);}
  const state=()=>p.evaluate(()=>__wordwheel.state());
  await fresh(); await p.keyboard.type('CAT');
  check((await state()).current==='CAT',`${name}: type letters`);
  await p.keyboard.press('Enter');check((await state()).found.includes('CAT'),`${name}: keyboard submits word`);
  await p.keyboard.type('ACT');await p.keyboard.press('Enter');
  await p.waitForFunction(()=>!document.querySelector('#results-dialog').hidden);
  await p.locator('#next-level').click();check((await state()).levelIndex===1,`${name}: advance after keyboard win`);
  await fresh();await p.locator('#menu-button').click();
  for(let i=0;i<12;i++){await p.keyboard.press(i%3===0?'Shift+Tab':'Tab');check(await p.evaluate(()=>!!document.activeElement.closest('#menu-dialog')),`${name}: modal focus contained`);}
  await p.keyboard.type('CAT');check((await state()).current==='',`${name}: menu blocks game keyboard`);
  await p.keyboard.press('Escape');check(await p.evaluate(()=>document.activeElement.id==='menu-button'),`${name}: focus restored`);
  await p.locator('.wheel-letter').first().focus();await p.keyboard.press('Space');
  check((await state()).current.length===1,`${name}: wheel button keyboard activation`);
  await p.keyboard.press('Space');check((await state()).current==='',`${name}: wheel button removes last letter`);
  await p.keyboard.type('CAT');
  await p.locator('#pick').click();await p.locator('.cell[role="button"]').first().focus();await p.keyboard.press('Enter');
  check((await state()).revealed.length===1,`${name}: keyboard picks square`);
  check((await state()).current==='CAT' && !(await state()).found.includes('CAT'),`${name}: hint Enter does not submit the current word`);
  async function pointerSequence(events) {await p.evaluate(events=>{
   const a=__wordwheel.letterCenter(0),b=__wordwheel.letterCenter(1),wheel=document.querySelector('#wheel');
   for(const [type,id,index] of events){const pt=index?b:a;wheel.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:id,pointerType:'touch',isPrimary:id===71,clientX:pt.x,clientY:pt.y}));}
  },events);}
  await fresh();await p.keyboard.type('C');const before=await state();
  await pointerSequence([['pointerdown',71,0],['pointermove',71,1],['pointercancel',71,1]]);
  check((await state()).current===before.current,`${name}: cancellation restores prior selection`);
  await pointerSequence([['pointerdown',71,0],['pointerdown',72,1],['pointerup',72,1],['pointerup',71,0]]);
  check((await state()).current===before.current,`${name}: second finger cancels gesture`);
  await p.reload();check((await state()).current===before.current,`${name}: cancellation saved correctly`);
  await p.keyboard.type('AT');const len=(await state()).current.length;const r=await p.locator('#back').boundingBox();
  const x=r.x+r.width/2,y=r.y+r.height/2;
  await p.mouse.move(x,y);await p.mouse.down();await p.waitForTimeout(700);await p.mouse.move(x,y-30);await p.mouse.up();
  check((await state()).current.length===len-1,`${name}: long press with drift activates once`);
  const len2=(await state()).current.length;
  await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x,y-130);await p.mouse.move(x,y);await p.mouse.up();
  check((await state()).current.length===len2,`${name}: large returning drag cancels`);
  await fresh();await p.locator('#pick').click();
  const cell=await p.locator('.cell').first().boundingBox(),cx=cell.x+cell.width/2,cy=cell.y+cell.height/2;
  await p.mouse.move(cx,cy);await p.mouse.down();await p.waitForTimeout(1600);await p.mouse.move(cx+80,cy);await p.mouse.move(cx,cy);await p.mouse.up();
  check((await state()).revealed.length===0,`${name}: slow returning grid drag cannot become a click`);
  await fresh();
  await p.evaluate(()=>{while(__wordwheel.state().found.length<__wordwheel.level().words.length)document.querySelector('#hint').click();document.querySelector('#menu-button').click();document.querySelector('#menu-goto').click();document.querySelector('#goto-plus').click();document.querySelector('#goto-go').click();});
  await p.waitForTimeout(1600);
  check((await state()).levelIndex===1 && (await state()).found.length===0,`${name}: level change during celebration keeps fresh puzzle`);
  check(await p.locator('#results-dialog').isHidden(),`${name}: stale completion does not open results`);
  await p.keyboard.type('DOG');check((await state()).current.length>0,`${name}: new level remains playable`);
  if(name==='chromium') {
   await fresh();const cdp=await p.context().newCDPSession(p);
   await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});
   check(await p.evaluate(()=>visualViewport.scale>1.5),'Chromium: zoom emulation active');
   await p.evaluate(()=>{document.querySelector('#menu-button').click();document.querySelector('#menu-goto').click();for(let i=0;i<4;i++)document.querySelector('#goto-plus').click();document.querySelector('#goto-go').click();});
   check(await p.evaluate(()=>[...document.querySelectorAll('.wheel-letter')].map(el=>el.textContent).join('')===__wordwheel.level().letters),'Chromium: changing level while zoomed redraws all letters');
   check(await p.evaluate(()=>__wordwheel.letterCenter(3).x>0),'Chromium: zoomed new wheel has valid fourth position');
   await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});await cdp.detach();
  }
  // Simulate Safari reporting a zoomed visual height as innerHeight during a level change.
  await p.setViewportSize({width:768,height:1024});await fresh();
  const beforeZoom=await p.locator('#app').boundingBox();
  await p.evaluate(()=>{
   Object.defineProperty(window,'innerHeight',{configurable:true,value:512});
   Object.defineProperty(visualViewport,'height',{configurable:true,value:512});
   Object.defineProperty(visualViewport,'scale',{configurable:true,value:2});
   document.querySelector('#menu-button').click();document.querySelector('#menu-goto').click();
   for(let i=0;i<4;i++)document.querySelector('#goto-plus').click();document.querySelector('#goto-go').click();
  });
  check((await p.locator('#app').boundingBox()).height===beforeZoom.height,`${name}: zoomed next level keeps unzoomed board height`);
  check(await p.evaluate(()=>!__wordwheel.ipad().twoCol),`${name}: zoom keeps portrait iPad layout`);
  // Layout and complete six-letter word strip across phones, tablets and laptop windows.
  for(const [width,height] of [[320,568],[375,667],[390,740],[390,844],[430,932],[568,320],[667,375],[844,390],[768,1024],[1024,768],[820,1180],[1180,820],[1366,768],[1440,900],[900,480],[844,330],[640,600]]) {
   await p.setViewportSize({width,height});await fresh(400,'&fast=1');await p.keyboard.type('MENTAL');
   const m=await p.evaluate(()=>{
    const r=el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};
    const app=r(document.querySelector('#app'));
    const els=[...document.querySelectorAll('.cell,.wheel-letter,.topbar button,.tool,#strip,#level-title')];
    return {app,items:els.map(el=>({id:el.id||el.className,...r(el),fits:el.scrollWidth<=el.clientWidth+2})),width:innerWidth,height:innerHeight,docHeight:document.documentElement.scrollHeight,current:__wordwheel.state().current};
   });
   check(m.current==='MENTAL',`${name} ${width}x${height}: six-letter entry`);
   check(m.items.every(r=>r.x>=-1&&r.right<=m.width+1&&r.y>=-1&&r.bottom<=m.docHeight+1),`${name} ${width}x${height}: controls within scrollable screen ${JSON.stringify(m.items.filter(r=>r.x< -1||r.right>m.width+1||r.y< -1||r.bottom>m.docHeight+1))}`);
   check(m.items.every(r=>r.fits),`${name} ${width}x${height}: text fits ${JSON.stringify(m.items.filter(r=>!r.fits))}`);
   if((width>=700&&height>=375)||height>=568)check(m.docHeight<=height+1,`${name} ${width}x${height}: game fits without scrolling`);
   if(name==='webkit'&&[[390,844],[844,390],[768,1024],[1024,768],[1366,768]].some(([w,h])=>w===width&&h===height))await p.screenshot({path:`${out}after-${width}x${height}.png`});
  }
  await p.setViewportSize({width:320,height:568});
  for(const lang of ['en','es','vi']){await fresh(1000,`&lang=${lang}&fast=1`);check(await p.evaluate(()=>{const el=document.querySelector('#level-title');return el.scrollWidth<=el.clientWidth+1}),`${name}: narrow ${lang} level title fits`);}
  for(const body of ['const broken = (((;', "throw new Error('boot regression');"]) {
   const broken = await b.newPage({serviceWorkers:'block'});
   await broken.route(url=>url.pathname.endsWith('/app.js'),route=>route.fulfill({status:200,contentType:'application/javascript',body}));
   await broken.goto(BASE);await broken.locator('#boot-fail').waitFor({state:'visible'});
   check(await broken.locator('#boot-fail').isVisible(),`${name}: broken script shows recovery screen`);await broken.close();
  }
  check(errors.length===0,`${name}: no script errors: ${errors.join('; ')}`);
  await p.close();
 } finally {await b.close();}
}
// A separate origin cache prefix protects the original game's offline installation.
const b=await chromium.launch();
try {
 const ctx=await b.newContext();const p=await ctx.newPage();
 await p.goto(BASE);await p.evaluate(async()=>{await navigator.serviceWorker.ready;await caches.open('claude-word-wheel-v4');});
 await p.reload();await p.waitForFunction(()=>navigator.serviceWorker.controller);
 const cacheNames=await p.evaluate(()=>caches.keys());
 check(cacheNames.includes('claude-word-wheel-v4')&&cacheNames.includes('ai-words-v1'),'worker keeps old game cache');
 await p.keyboard.type('CA');await ctx.setOffline(true);await p.reload();await p.waitForFunction(()=>window.__wordwheelReady);
 check(await p.evaluate(()=>__wordwheel.state().current==='CA'),'offline reload retains current word');
 await p.keyboard.type('T');await p.keyboard.press('Enter');check(await p.evaluate(()=>__wordwheel.state().found.includes('CAT')),'offline play accepts word');
 await ctx.close();
} finally {await b.close();}
console.log(`PASS: ${checks} review checks (WebKit, Chromium, offline)`);
