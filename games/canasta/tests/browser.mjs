import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as E from '../engine.js';
const {webkit,chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/opt/homebrew/lib/node_modules/playwright/index.mjs');
const URL=process.env.CANASTA_URL||'http://127.0.0.1:8802/canasta/',KEY='ai-canasta-game-v1',out=new globalThis.URL('../output/playwright/',import.meta.url);await fs.mkdir(out,{recursive:true});
const found={};
for(let seed=1;seed<=15;seed++){
 let s=E.newGame(seed),r={version:1,seed,actions:[]};
 while(s.phase!=='matchOver'){
  const keep=name=>found[name]||=structuredClone(r);
  if(s.player===0){if(s.phase==='draw'){keep('draw');if(E.planMelds(s,true))keep('pickup');}if(s.phase==='meld'){keep('meld');if(E.planMelds(s))keep('draft');if(E.hasCanasta(s.teams[0].melds))keep('canasta');}}
  if(s.phase==='roundOver')keep('roundOver');
  const a=s.phase==='roundOver'?{type:'next'}:E.botAction(s);r.actions.push(a);s=E.act(s,a);
 }
 found.matchOver||=structuredClone(r);
}
// A legal long-hand fixture: build the pile by drawing/discarding without melding.
for(let seed=1;seed<100&&!found.large;seed++){
 let s=E.newGame(seed),r={version:1,seed,actions:[]};
 for(let step=0;step<200&&['draw','meld'].includes(s.phase);step++){
  if(s.player===0&&s.phase==='draw'&&s.discard.length>=35){const g=E.planMelds(s,true);if(g){const a={type:'take',groups:g};s=E.act(s,a);r.actions.push(a);if(s.hands[0].length>=30){found.large=structuredClone(r);break;}}}
  const a=s.phase==='draw'?{type:'draw'}:{type:'discard',id:s.hands[s.player][(step+seed)%s.hands[s.player].length]};s=E.act(s,a);r.actions.push(a);
 }
}
assert.ok(found.large);await fs.writeFile(new globalThis.URL('fixtures.json',out),JSON.stringify(found));
const results=[],errors=[];
const browser=await webkit.launch();
try{
 const context=await browser.newContext({viewport:{width:390,height:740},serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(key=>{const next=sessionStorage.getItem('next-test-record');if(next){localStorage.setItem(key,next);sessionStorage.removeItem('next-test-record');}},KEY);
 await page.clock.install();await page.clock.pauseAt(new Date());await page.goto(URL);
 const read=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 const seed=async r=>{await page.evaluate(r=>sessionStorage.setItem('next-test-record',JSON.stringify(r)),r);await page.reload();};
 const sizes=[[320,568],[375,667],[390,740],[430,932],[667,375],[844,390],[820,1180],[1180,820],[1440,900]];let layouts=0;
 for(const [width,height] of sizes){
  await page.setViewportSize({width,height});
  for(const name of ['draw','meld','draft','pickup','canasta','large','roundOver','matchOver']){
   await seed(found[name]);if(name==='draft')await page.locator('#suggest').click();if(name==='pickup')await page.locator('#take').click();
   const geo=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,cards:[...document.querySelectorAll('#hand .card')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height};}),buttons:[...document.querySelectorAll('.actions button:not([hidden])')].map(e=>e.getBoundingClientRect().height)}));
   assert.ok(geo.scrollWidth<=width+1,`${name} overflow ${width}x${height}: ${geo.scrollWidth}`);assert.ok(geo.cards.every(r=>r.width>=62&&r.height>=90&&r.left>=0&&r.right<=width+1),`${name} card geometry`);assert.ok(geo.buttons.every(h=>h>=48));
   if((width===390&&['draw','draft','large'].includes(name))||(width===844&&name==='canasta')||(width===820&&name==='pickup')||(width===1440&&name==='draft'))await page.screenshot({path:new globalThis.URL(`${name}-${width}x${height}.png`,out).pathname,fullPage:true});layouts++;
  }
 }
 results.push({check:'WebKit responsive states',passed:layouts,viewports:sizes});
 if(process.env.LAYOUT_ONLY){await fs.writeFile(new globalThis.URL('layout-results.json',out),JSON.stringify(results,null,2));await browser.close();console.log('72 layouts passed');process.exit(0);}
 await page.setViewportSize({width:390,height:740});await seed(found.meld);
 await page.locator('#hand .card').first().click();let selection=(await read()).ui.selected;await page.reload();assert.deepEqual((await read()).ui.selected,selection);assert.equal(await page.locator('#hand [aria-pressed=true]').count(),1);
 await page.locator('#hand .card').first().click();assert.equal(await page.locator('#hand [aria-pressed=true]').count(),0);await page.locator('#hand .card').nth(1).focus();await page.keyboard.press('Space');assert.equal(await page.locator('#hand [aria-pressed=true]').count(),1);await page.setViewportSize({width:844,height:390});assert.equal(await page.locator('#hand [aria-pressed=true]').count(),1);
 const len=E.restore(await read()).hands[0].length;await page.locator('#discard-action').focus();await page.keyboard.press('Enter');assert.equal(E.restore(await read()).hands[0].length,len-1);
 results.push({check:'selection correction, reload, rotation, keyboard discard',passed:true});
 await seed(found.draft);await page.locator('#suggest').click();const draft=await read();assert.ok(draft.ui.drafts.length);await page.reload();assert.deepEqual((await read()).ui.drafts,draft.ui.drafts);await page.locator('#clear').click();assert.equal((await read()).ui.drafts.length,0);assert.deepEqual((await read()).actions,draft.actions);
 await page.locator('#suggest').click();const before=E.restore(await read());await page.locator('#commit').click();const after=E.restore(await read());assert.ok(after.hands[0].length<before.hands[0].length);
 results.push({check:'draft preview, persistence, cancellation and confirmation',passed:true});
 await seed(found.pickup);const topBefore=E.restore(await read()).discard.length;await page.locator('#take').click();assert.equal(E.restore(await read()).discard.length,topBefore);await page.locator('#clear').click();assert.equal(E.restore(await read()).discard.length,topBefore);await page.locator('#take').click();
 const pickupPlan=E.planMelds(E.restore(await read()),true);await seed({...found.pickup,ui:{taking:true,drafts:pickupPlan}});await page.locator('#commit').click();assert.equal(E.restore(await read()).discard.length,0);results.push({check:'pile planning, cancellation and atomic pickup',passed:true});
 await seed(found.meld);await page.locator('#hand .card').first().click();await page.locator('#discard-action').click();await page.locator('#menu').click();const paused=await read();await page.clock.runFor(10000);assert.deepEqual((await read()).actions,paused.actions);
 await page.locator('#pace').selectOption('2800');await page.locator('#help').click();await page.keyboard.press('Escape');assert.equal(await page.locator(':focus').getAttribute('id'),'menu');await page.locator('#menu').click();assert.equal(await page.locator('#pace').inputValue(),'2800');await page.locator('#new').click();await page.locator('#keep').click();assert.deepEqual((await read()).actions,paused.actions);
 results.push({check:'menus pause bots, settings persist, Escape restores focus, new match cancel',passed:true});
 await seed(found.roundOver);await page.locator('#show-result').click();assert.equal(await page.locator('#result-dialog').evaluate(e=>e.open),true);const round=E.restore(await read()).round;await page.locator('#next').click();assert.equal(E.restore(await read()).round,round+1);
 await seed(found.matchOver);await page.locator('#show-result').click();assert.match(await page.locator('#result-title').textContent(),/win/);await page.locator('#next').click();assert.equal((await read()).actions.length,0);results.push({check:'round results and match restart',passed:true});
 // Play a complete match through visible human controls; let real bot timers advance.
 await seed({version:1,seed:3,actions:[]});let moves=0;
 while(moves++<1200){
  let s=E.restore(await read());if(s.phase==='matchOver')break;
  if(s.phase==='roundOver'){if(!await page.locator('#result-dialog').evaluate(e=>e.open))await page.locator('#show-result').click();await page.locator('#next').click();continue;}
  if(s.player!==0){await page.clock.runFor(2801);continue;}
  const a=E.botAction(s);
  if(a.type==='draw'){await page.locator('#draw').click();}
  else if(a.type==='discard'){await page.locator(`#hand [data-card="${a.id}"]`).click();await page.locator('#discard-action').click();}
  else if(a.type==='take'){
   await page.locator('#take').click();let r=await read();const existing=r.ui.drafts;
   for(const g of a.groups){const already=existing.find(x=>x.rank===g.rank)?.ids||[];const extra=g.ids.filter(id=>!already.includes(id));if(!extra.length)continue;for(const id of extra)await page.locator(`#hand [data-card="${id}"]`).click();if(extra.every(id=>E.card(id).wild))await page.locator('#wild-rank').selectOption(g.rank);await page.locator('#stage').click();}
   await page.locator('#commit').click();
  }else if(a.type==='meld'){
   for(const g of a.groups){for(const id of g.ids)await page.locator(`#hand [data-card="${id}"]`).click();if(g.ids.every(id=>E.card(id).wild))await page.locator('#wild-rank').selectOption(g.rank);await page.locator('#stage').click();}await page.locator('#commit').click();
  }
 }
 assert.equal(E.restore(await read()).phase,'matchOver');results.push({check:'complete match through visible controls',passed:true,steps:moves});
 // Recovery: overwrite only at navigation startup, so pagehide cannot mask corruption.
 await page.evaluate(({key,backup})=>{sessionStorage.setItem('next-test-record','{broken');localStorage.setItem(key+'-backup',JSON.stringify(backup));},{key:KEY,backup:found.meld});await page.reload();assert.deepEqual((await read()).actions,found.meld.actions);assert.match(await page.locator('#save-notice').textContent(),/Recovered/);results.push({check:'corrupt primary save recovers valid backup',passed:true});
 assert.deepEqual(errors,[]);await context.close();
 // No worker interception for the offline test.
 await fs.writeFile(new globalThis.URL('webkit-results.json',out),JSON.stringify(results,null,2));
 const offlineBrowser=await chromium.launch({channel:'chrome'});const offline=await offlineBrowser.newContext({viewport:{width:390,height:740}}),op=await offline.newPage();await op.goto(URL);await op.evaluate(()=>navigator.serviceWorker.ready);await op.reload();await op.waitForFunction(()=>!!navigator.serviceWorker.controller);await op.locator('#draw').click();const saved=await op.evaluate(k=>localStorage.getItem(k),KEY);await offline.setOffline(true);await op.reload();assert.match(await op.title(),/Canasta/);assert.equal(await op.locator('#hand .card').count(),12);assert.equal(await op.evaluate(k=>localStorage.getItem(k),KEY),saved);results.push({check:'Chrome offline reload and saved state',passed:true});await offline.close();await offlineBrowser.close();
}finally{await browser.close();}
// Native Chromium touch input, including holds and modest upward drift.
const chrome=await chromium.launch({channel:'chrome'});
try{
 const c=await chrome.newContext({viewport:{width:390,height:740},isMobile:true,hasTouch:true,serviceWorkers:'block'}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(({key,r})=>localStorage.setItem(key,JSON.stringify(r)),{key:KEY,r:found.meld});await p.goto(URL);await p.clock.install();await p.clock.pauseAt(new Date());const cdp=await c.newCDPSession(p);
 async function touch(sel,{dy=0,hold=0,cancel=false,extra=false}={}){const target=p.locator(sel);await target.evaluate(e=>e.scrollIntoView({block:'center'}));const b=await target.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});if(hold)await p.clock.runFor(hold);if(extra)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1},{x:x+15,y:y+10,id:2}]});if(dy)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+dy,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});}
 await touch('#hand .card:first-child',{hold:1800});assert.equal(await p.locator('#hand [aria-pressed=true]').count(),1);await touch('#hand .card:first-child',{hold:900});assert.equal(await p.locator('#hand [aria-pressed=true]').count(),0);
 await touch('#hand .card:first-child',{dy:-22});assert.equal(await p.locator('#hand [aria-pressed=true]').count(),0);await touch('#hand .card:first-child',{cancel:true});assert.equal(await p.locator('#hand [aria-pressed=true]').count(),0);await touch('#hand .card:first-child',{extra:true});assert.equal(await p.locator('#hand [aria-pressed=true]').count(),0);
 await touch('#hand .card:first-child');assert.equal(await p.locator('#hand [aria-pressed=true]').count(),1);const before=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).actions.length,KEY);await touch('#discard-action',{dy:-28,hold:1700});assert.equal(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).actions.length,KEY),before+1);await p.locator('#discard-action').dispatchEvent('click',{detail:1});assert.equal(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).actions.length,KEY),before+1);
 await fs.writeFile(new globalThis.URL('touch-events.json',out),JSON.stringify({status:'passed'}));
 assert.equal(await p.locator('#hand').evaluate(e=>getComputedStyle(e).userSelect),'none');assert.equal(await p.locator('#hand .card').first().evaluate(e=>getComputedStyle(e).touchAction),'manipulation');results.push({check:'native Chrome touch: holds, action drift, card drag, cancel, multiple fingers, duplicate click; selection prevention and zoom-capable CSS',passed:true});await c.close();
}finally{await chrome.close();}
assert.deepEqual(errors,[]);await fs.writeFile(new globalThis.URL('results.json',out),JSON.stringify({date:new Date().toISOString(),results,errors},null,2));console.log(JSON.stringify(results,null,2));
