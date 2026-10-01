import {webkit,chromium} from 'playwright';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const E=createRequire(import.meta.url)('../engine.js'),url=process.env.RUMMY_URL||'http://127.0.0.1:8803/',KEY='ai-rummy-game-v1',out=new URL('../output/playwright/',import.meta.url);
await fs.mkdir(out,{recursive:true});const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const F={};
for(let seed=1;seed<100;seed++){
 const random=rng(seed),initial={deck:E.shuffled(random),dealer:1,target:100};let s=E.start(initial);const actions=[];
 for(let i=0;i<3000&&s.phase!=='matchOver';i++){
  const snap=()=>structuredClone({version:1,initial,actions});
  if(s.turn===0&&s.phase==='draw')F.draw||=snap();
  if(s.turn===0&&s.phase==='play'){F.play||=snap();if(E.meldsIn(s.hands[0]).length)F.meld||=snap();if(E.chooseAction(E.viewFor(s)).type==='add')F.add||=snap();if(s.takenDiscard)F.kept||=snap();if(s.melds.length>=4)F.table||=snap();}
  if(s.phase==='handOver')F.handOver||=snap();
  const a=s.phase==='handOver'?{type:'nextHand',deck:E.shuffled(random)}:E.chooseAction(E.viewFor(s));actions.push(a);s=E.step(s,a);
 }
 if(s.phase==='matchOver')F.matchOver||=structuredClone({version:1,initial,actions});
 if(Object.keys(F).length===8)break;
}
assert.equal(Object.keys(F).length,8);await fs.writeFile(new URL('fixtures.json',out),JSON.stringify(F));
const results=[],errors=[];
async function seed(page,rec,backup=null){await page.evaluate(({key,rec,backup})=>{localStorage.setItem(key,typeof rec==='string'?rec:JSON.stringify(rec));if(backup)localStorage.setItem(key+'-backup',JSON.stringify(backup));else localStorage.removeItem(key+'-backup');},{key:KEY,rec,backup});await page.reload();}
const read=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
if(!process.env.TOUCH_ONLY){
 const b=await webkit.launch({executablePath:process.env.WEBKIT_PATH||'/Users/shawnmac/Library/Caches/ms-playwright/webkit-2359/pw_run.sh'});
 try{
  const page=await b.newPage({viewport:{width:390,height:740},serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.clock.pauseAt(new Date());await page.goto(url);
  const sizes=[[320,568],[375,667],[390,740],[430,932],[667,375],[844,390],[768,1024],[1024,768],[1366,768]];
  let count=0;
  for(const [width,height] of sizes){await page.setViewportSize({width,height});for(const name of Object.keys(F)){
   await seed(page,F[name]);const g=await page.evaluate(()=>({w:document.documentElement.scrollWidth,cards:[...document.querySelectorAll('#hand .card')].map(c=>{const r=c.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,top:r.top,bottom:r.bottom};})}));
   assert.ok(g.w<=width+1,`${name} overflow ${width}`);for(const c of g.cards){assert.ok(c.left>=0&&c.right<=width+1);assert.ok(c.width>=45,`${name} narrow ${c.width} at ${width}`);}
   if([390,844,768,1366].includes(width)&&['meld','table','draw','matchOver'].includes(name))await page.screenshot({path:new URL(`${name}-${width}x${height}.png`,out).pathname,fullPage:true});count++;
  }}results.push({check:'WebKit responsive game states',cases:count,viewports:sizes});
  await page.setViewportSize({width:390,height:740});await seed(page,F.draw);
  await page.locator('#stock').click();await page.locator('#discard').click();assert.equal(await page.locator('#discard').getAttribute('aria-pressed'),'true');await page.reload();assert.equal(await page.locator('#discard').getAttribute('aria-pressed'),'true');await page.locator('#primary-action').click();assert.equal(E.restore(await read(page)).phase,'play');
  const kept=E.restore(await read(page)).takenDiscard;await page.locator(`[data-card="${kept}"]`).click();assert.ok(await page.locator('#primary-action').isDisabled());await page.locator('#clear').click();
  await seed(page,F.meld);const a=E.chooseAction(E.viewFor(E.restore(F.meld)));for(const id of a.cards)await page.locator(`[data-card="${id}"]`).click();assert.ok(await page.locator('#meld-action').isEnabled());await page.reload();assert.equal(await page.locator('#hand [aria-pressed=true]').count(),a.cards.length);await page.setViewportSize({width:844,height:390});assert.equal(await page.locator('#hand [aria-pressed=true]').count(),a.cards.length);await page.locator('#meld-action').click();assert.equal(E.restore(await read(page)).melds.length,E.restore(F.meld).melds.length+1);
  await seed(page,F.add);await page.locator('#hint').click();assert.ok(await page.locator('#add-action').isEnabled());await page.locator('#add-action').click();assert.ok(E.restore(await read(page)).hands[0].length<E.restore(F.add).hands[0].length);results.push({check:'draw correction, keep restriction, multi-selection restore/rotation, meld and layoff',passed:true});
  await page.locator('#menu-button').click();const paused=JSON.stringify(await read(page));await page.clock.runFor(10000);assert.equal(JSON.stringify(await read(page)),paused);await page.locator('[data-panel=help]').click();assert.ok(await page.locator('#close-panel').isVisible());await page.locator('#close-panel').click();assert.equal(await page.locator(':focus').getAttribute('id'),'menu-button');
  await page.locator('#menu-button').click();await page.locator('[data-panel=settings]').click();await page.locator('#target').selectOption('200');await page.locator('#save-settings').click();assert.equal(E.restore(await read(page)).target,100);
  await seed(page,F.draw);await page.locator('#stock').focus();await page.keyboard.press('Enter');await page.locator('#primary-action').focus();await page.keyboard.press('Space');assert.equal(E.restore(await read(page)).phase,'play');await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('#hand .card').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s');results.push({check:'menu pause, focus restoration, settings, keyboard and reduced motion',passed:true});
  // Entire match through visible controls, including deliberate confirmation.
  await seed(page,F.draw);let turns=0;
  while(true){await page.clock.runFor(550);const s=E.restore(await read(page));if(s.phase==='matchOver')break;assert.ok(++turns<5000);if(s.phase==='handOver'){await page.locator('#primary-action').click();continue;}if(s.turn===1){await page.clock.runFor(1500);continue;}const a=E.chooseAction(E.viewFor(s));await page.locator('#hint').click();if(a.type==='meld')await page.locator('#meld-action').click();else if(a.type==='add')await page.locator('#add-action').click();else await page.locator('#primary-action').click();}
  await page.reload();assert.equal(E.restore(await read(page)).phase,'matchOver');await page.locator('#primary-action').click();assert.equal(E.restore(await read(page)).target,200);const once=await read(page);await page.locator('#primary-action').evaluate(el=>el.click());assert.deepEqual(await read(page),once);results.push({check:'complete match via controls, result reload, new target and repeated activation',iterations:turns,passed:true});
  await seed(page,'{bad',F.play);assert.match(await page.locator('#storage-note').innerText(),/Recovered/);
  const denied=await b.newPage();await denied.addInitScript(()=>{Storage.prototype.setItem=()=>{throw Error('Storage denied');};});await denied.goto(url);assert.match(await denied.locator('#storage-note').innerText(),/cannot save/);await denied.close();results.push({check:'backup recovery and unavailable storage',passed:true});
 }finally{await b.close();}
}
await fs.writeFile(new URL('browser-partial.json',out),JSON.stringify(results,null,2));
if(!process.env.NO_TOUCH){
 const b=await chromium.launch({channel:'chrome'});
 try{
  const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await seed(page,F.draw);const cdp=await ctx.newCDPSession(page);
  async function press(sel,{dy=0,hold=80,cancel=false,extra=false}={}){const el=page.locator(sel).first();await el.scrollIntoViewIfNeeded();const r=await el.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;const pt=(id,x,y)=>({id,x,y,radiusX:3,radiusY:3,force:1});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt(0,x,y)]});if(extra)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt(0,x,y),pt(1,x+18,y+18)]});if(dy)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pt(0,x,y+dy)]});await new Promise(r=>setTimeout(r,hold));await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});}
  await press('#stock',{hold:6500,dy:-24});assert.equal(await page.locator('#stock').getAttribute('aria-pressed'),'true');await press('#primary-action',{hold:6500,dy:-24});assert.equal(E.restore(await read(page)).phase,'play');let cards=page.locator('#hand .card');await press('#hand .card');assert.equal(await page.locator('#hand [aria-pressed=true]').count(),1);await press('#hand .card:nth-child(2)');assert.equal(await page.locator('#hand [aria-pressed=true]').count(),2);
  await press('#clear');await press('#hand .card',{dy:-25});assert.equal(await page.locator('#hand [aria-pressed=true]').count(),0);await press('#hand .card',{cancel:true});assert.equal(await page.locator('#hand [aria-pressed=true]').count(),0);await press('#hand .card',{extra:true});assert.equal(await page.locator('#hand [aria-pressed=true]').count(),0);
  await press('#menu-button');await press('[data-panel=help]');await press('#close-panel',{hold:6500,dy:-24});assert.ok(!(await page.locator('#panel').evaluate(e=>e.open)));const unchanged=await read(page);await new Promise(r=>setTimeout(r,600));assert.deepEqual(await read(page),unchanged);
  await seed(page,F.draw);await press('#stock',{dy:-70});assert.equal(await page.locator('#stock').getAttribute('aria-pressed'),'false');results.push({check:'native Chrome touch: 6.5s holds, 24px button drift, multi-selection, card drift, cancellation, extra finger, large drag, modal tap-through',passed:true});
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);const caches=await page.evaluate(async()=>{const c=await window.caches.open('ai-rummy-v2');return (await c.keys()).length;});assert.equal(caches,12);await ctx.setOffline(true);await page.reload();await press('#stock');await press('#primary-action');assert.equal(E.restore(await read(page)).phase,'play');await press('#menu-button');await press('[data-panel=help]');assert.match(await page.locator('#panel-body').innerText(),/Draw. Build. Discard./);results.push({check:'offline reload, game actions, Help and installation assets',cacheEntries:caches,passed:true});
 }finally{await b.close();}
}
assert.deepEqual(errors,[]);await fs.writeFile(new URL(process.env.TOUCH_ONLY?'touch-results.json':'browser-results.json',out),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
