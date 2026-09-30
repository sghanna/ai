import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {webkit,chromium,KEY,url,createFixtures,artifacts} from './support.mjs';
const fixtures=createFixtures(),PREFS='ai-hearts-settings-v2',report=[],errors=[];
const screens=[['menu',null,'menu-dialog'],['settings','settings-button','settings-dialog'],['help','how-to-play-button','help-dialog'],['names-promise','names-button','names-dialog'],['names-editor','names-button','names-dialog'],['last-trick','last-trick-button','last-trick-dialog'],['new-game','new-game','new-dialog']];
const b=await webkit.launch();
const saved=p=>p.evaluate(k=>localStorage.getItem(k),KEY);
async function open(language,viewport,state=fixtures.late){
 const c=await b.newContext({viewport,hasTouch:true,isMobile:true,serviceWorkers:'block'}),p=await c.newPage();
 p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(({KEY,PREFS,state,language})=>{if(!localStorage.getItem(KEY))localStorage.setItem(KEY,JSON.stringify({version:2,game:state,selected:[]}));if(!localStorage.getItem(PREFS))localStorage.setItem(PREFS,JSON.stringify({language,pace:'slow',sound:false,tapToPlay:false}));},{KEY,PREFS,state,language});
 const now=new Date('2026-09-30T21:00:00Z');await p.clock.install({time:now});await p.clock.pauseAt(now);await p.goto(url);return {c,p};
}
async function panel(p,button){await p.locator('#menu-button').click();if(button)await p.locator('#'+button).click();}
async function layout(p,id,label){
 const m=await p.locator('#'+id).evaluate(d=>{
  const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  const visible=e=>e.getClientRects().length>0;
  return {viewport:{w:innerWidth,h:innerHeight},dialog:rect(d),overflow:d.scrollWidth>d.clientWidth+1,close:rect(d.querySelector('.close-button')),footers:[...d.querySelectorAll('.dialog-footer button')].filter(visible).map(rect),bodies:[...d.querySelectorAll('.dialog-body')].filter(visible).map(e=>({overflow:e.scrollWidth>e.clientWidth+1,height:e.clientHeight})),elements:[...d.querySelectorAll('button,select,input')].filter(visible).map(e=>({label:e.id||e.textContent.trim(),...rect(e)}))};
 });
 const within=r=>r.left>=0&&r.right<=m.viewport.w+1&&r.top>=0&&r.bottom<=m.viewport.h+1;
 assert(!m.overflow,label+' dialog width');assert(m.bodies.every(r=>!r.overflow&&r.height>0),label+' body fits');assert(within(m.dialog),label+' dialog fits');assert(within(m.close),label+' close visible');
 assert(m.footers.length&&m.footers.every(within),label+' footer visible');assert(m.elements.every(r=>r.height>=51),label+' large controls');
 return m;
}
try{
 for(const language of ['en','es','vi'])for(const [width,height] of [[320,568],[375,667],[390,430],[844,390],[768,1024]]){
  const {c,p}=await open(language,{width,height});const before=await saved(p);
  for(const [screen,button,id] of screens){
   await panel(p,button);if(screen==='names-editor')await p.locator('#promise-button').click();
   await p.clock.runFor(32);const label=`${language} ${width}x${height} ${screen}`,start=await layout(p,id,label);
   assert(await p.locator('#'+id).evaluate(d=>d.contains(document.activeElement)),label+' focus in modal');
   await p.locator('#'+id+' .dialog-body').evaluateAll(es=>es.forEach(e=>{e.scrollTop=e.scrollHeight;}));
   const end=await layout(p,id,label+' scrolled');assert.deepEqual(end.footers,start.footers,label+' footer stays fixed');
   await p.clock.runFor(5000);assert.equal(await saved(p),before,label+' game paused and unchanged');
   if(screen==='names-editor'){
    await p.locator('#opponent-3').focus();assert.equal(await p.locator('#opponent-3').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
    await layout(p,id,label+' input focused');
   }
   await p.keyboard.press('Escape');await p.clock.runFor(32);await p.waitForTimeout(30);assert.equal(await p.evaluate(()=>document.activeElement.id),'menu-button',label+' focus returns');
   report.push({language,width,height,screen});
  }
  await c.close();
 }
 {
  const {c,p}=await open('en',{width:390,height:740},fixtures.pass);await panel(p);
  assert(await p.locator('#last-trick-button').isDisabled());assert(await p.locator('#last-trick-hint').isVisible());
  await p.locator('#settings-button').click();await p.locator('#language').selectOption('es');
  assert.equal(await p.locator('#settings-title').textContent(),'Ajustes');await p.locator('#pace').selectOption('normal');await p.locator('#tap-to-play').selectOption('on');
  await p.locator('.offline-tip summary').click();assert(await p.locator('.offline-tip').getAttribute('open')!==null);
  for(let i=0;i<12;i++){await p.keyboard.press('Tab');assert(await p.locator('#settings-dialog').evaluate(d=>document.activeElement===document.body||d.contains(document.activeElement)),'Tab never reaches inert game controls');}
  await p.locator('#settings-dialog .close-button').click();await p.clock.runFor(1);assert.equal(await p.evaluate(()=>document.activeElement.id),'menu-button');
  await p.reload();assert.equal(await p.locator('#language').inputValue(),'es');assert.equal(await p.locator('#pace').inputValue(),'normal');assert.equal(await p.locator('#tap-to-play').inputValue(),'on');await c.close();
 }
 assert.deepEqual(errors,[]);console.log(`PASS: ${report.length} menu/language/viewport layouts, fixed actions, focus, scrolling, white inputs, paused saves, keyboard isolation, disabled-trick hint and settings persistence.`);
 await fs.writeFile(`${artifacts}/menu-refinement/layout-checks.json`,JSON.stringify({checks:report,errors},null,2));
}finally{await b.close();}
// Native browser touch catches compatibility clicks and scrolling that synthetic pointer events cannot.
const chrome=await chromium.launch();
try{
 const c=await chrome.newContext({viewport:{width:390,height:740},isMobile:true,hasTouch:true}),p=await c.newPage();
 await p.goto(url);await p.evaluate(()=>navigator.serviceWorker.ready);await p.reload();
 const cdp=await c.newCDPSession(p);
 async function slow(selector,drift=24){
  await p.locator(selector).scrollIntoViewIfNeeded();const r=await p.locator(selector).boundingBox(),x=r.x+24,y=r.y+8;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await p.waitForTimeout(1400);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-drift}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }
 await slow('#menu-button');assert(await p.locator('#menu-dialog').isVisible(),'slow drift opens Menu without closing it again');await slow('#settings-button');assert(await p.locator('#settings-dialog').isVisible(),'slow drift opens Settings');assert.equal(await p.locator('#settings-dialog .offline-tip').getAttribute('open'),null,'no second activation');
 await slow('#settings-dialog .close-button');assert.equal(await p.locator('dialog[open]').count(),0,'one release closes without tap-through');
 await panel(p);await slow('#how-to-play-button',70);assert(await p.locator('#menu-dialog').isVisible(),'large drag cancels navigation');
 await p.locator('#how-to-play-button').click();const body=p.locator('#help-dialog .dialog-body'),r=await body.boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+100,y:r.y+r.height-40}]});
 for(let step=1;step<=8;step++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+100,y:r.y+r.height-40-step*35}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert(await body.evaluate(e=>e.scrollTop)>100,'body scrolls with native touch');
 await p.locator('#help-dialog .close-button').click();await panel(p,'names-button');await slow('#promise-button');assert(await p.locator('#names-editor').isVisible());
 await p.locator('#opponent-1').fill('Mom');await slow('#names-form [type="submit"]');assert.equal(await p.locator('dialog[open]').count(),0);
 await c.setOffline(true);await p.reload();await panel(p,'settings-button');assert.equal(await p.locator('#settings-dialog .dialog-footer').evaluate(e=>getComputedStyle(e).display),'grid','new CSS works offline');
 const cache=await p.evaluate(async()=>({names:await caches.keys(),files:await (await caches.open('ai-hearts-v9')).keys().then(r=>r.map(v=>v.url))}));assert(cache.files.some(s=>s.endsWith('/menus.css')));assert.equal(cache.files.length,20);
 console.log('PASS: native Chrome held/drift presses, no tap-through, large-drag cancellation, touch scrolling, names save, and 20-asset offline cache.');
 await fs.writeFile(`${artifacts}/menu-refinement/offline-check.json`,JSON.stringify(cache,null,2));await c.close();
}finally{await chrome.close();}
