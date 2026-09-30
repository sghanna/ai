import {webkit,chromium} from 'playwright';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const E=createRequire(import.meta.url)('../engine.js');
const URL=process.env.EUCHRE_URL||'http://127.0.0.1:8797/';
const KEY='ai-euchre-game-v1',out=new URLConstructor('../output/playwright/',import.meta.url);
function URLConstructor(...args){return new globalThis.URL(...args);}
await fs.mkdir(out,{recursive:true});
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function fixtures(){
 const found={};
 for(let seed=1;seed<80;seed++){
  const random=rng(seed),initial={deck:E.shuffled(random),dealer:seed===1?3:seed%4,stickDealer:seed%2===0};
  let s=E.start(initial);const actions=[];
  while(s.phase!=='matchOver'){
   const record=()=>structuredClone({version:1,initial,actions});
   if(s.phase==='bid'&&s.turn===0)found['bid'+s.round]||=record();
   if(s.phase==='discard'&&s.turn===0)found.discard||=record();
   if(s.phase==='play'&&s.turn===0){found.play||=record();if(E.legalCards(s.hands[0],s.trick,s.trump).length<s.hands[0].length)found.follow||=record();}
   if(s.phase==='play'&&s.sittingOut===0)found.sitting||=record();
   if(s.phase==='trick'){found.trick||=record();if(s.alone)found.loneTrick||=record();}
   if(s.phase==='handOver')found.handOver||=record();
   let action=s.phase==='trick'?{type:'collect'}:['handOver','redeal'].includes(s.phase)?{type:'nextHand',deck:E.shuffled(random)}:E.chooseAction(E.viewFor(s,s.turn));
   // Exercise more lone hands through the same legal API.
   if(seed%3===0&&action.type==='bid'&&action.suit)action.alone=true;
   actions.push(action);s=E.step(s,action);
  }
  found.matchOver||=structuredClone({version:1,initial,actions});
  if(Object.keys(found).length===10)break;
 }
 return found;
}
const F=fixtures();assert.equal(Object.keys(F).length,10);
const dealerInitial={deck:E.shuffled(rng(10)),dealer:0,stickDealer:true};
F.loneDiscard={version:1,initial:dealerInitial,actions:[{type:'bid',suit:null},{type:'bid',suit:E.card(dealerInitial.deck[20]).suit,alone:true}]};
F.forcedBid={version:1,initial:dealerInitial,actions:Array.from({length:7},()=>({type:'bid',suit:null}))};
await fs.writeFile(new URLConstructor('fixtures.json',out),JSON.stringify(F));
async function enableFixtures(page){
 await page.addInitScript(key=>{
  if(!window.name.startsWith('euchre-fixture:'))return;
  const data=JSON.parse(window.name.slice(15));window.name='';
  localStorage.setItem(key,data.main);
  if(data.backup)localStorage.setItem(key+'-backup',data.backup);else localStorage.removeItem(key+'-backup');
 },KEY);
}
async function seed(page,record,backup=null){
 await page.evaluate(data=>{window.name='euchre-fixture:'+JSON.stringify(data);},{main:typeof record==='string'?record:JSON.stringify(record),backup:backup?JSON.stringify(backup):null});
 await page.reload();
}
const results=[];
const wkOptions=process.env.WEBKIT_PATH?{executablePath:process.env.WEBKIT_PATH}:{};
const errors=[];
if(!process.env.TOUCH_ONLY){
const browser=await webkit.launch(wkOptions);
try{
 const context=await browser.newContext({viewport:{width:390,height:740},serviceWorkers:'block'}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));await enableFixtures(page);
 await page.clock.install();await page.clock.pauseAt(new Date());await page.goto(URL);
 const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 async function fixture(name){await seed(page,F[name]);assert.equal(E.restore(await read()).phase,E.restore(F[name]).phase);}
 const sizes=[[320,568],[375,667],[390,740],[430,932],[667,375],[844,390],[768,1024],[1024,768],[1366,768]];
 let layouts=0;
 for(const [width,height] of sizes){
  await page.setViewportSize({width,height});
  for(const name of ['bid1','bid2','discard','loneDiscard','follow','trick','loneTrick','sitting','handOver','matchOver']){
   await fixture(name);
   if(name.startsWith('bid'))await page.locator('[data-bid]:not([data-bid="pass"])').first().click();
   const geometry=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,cards:[...document.querySelectorAll('#hand .card')].map(c=>{const r=c.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};}),primary:getComputedStyle(document.getElementById('primary-action')).fontSize}));
   assert.ok(geometry.scrollWidth<=width+1,`${name} horizontal overflow at ${width}x${height}`);
   for(const c of geometry.cards){assert.ok(c.left>=0&&c.right<=width+1);assert.ok(c.width>=40,`${name} cards too small: ${c.width}`);}
   if((width===390&&['bid1','follow','trick'].includes(name))||(width===844&&name==='trick')||(width===768&&name==='discard')||(width===1366&&name==='follow'))await page.screenshot({path:new URLConstructor(`${name}-${width}x${height}.png`,out).pathname,fullPage:true});
   layouts++;
  }
 }
 results.push({check:'WebKit layouts',passed:layouts,viewports:sizes});
 await page.setViewportSize({width:390,height:740});await fixture('play');
 const enabled=page.locator('#hand .card:not(:disabled)');await enabled.first().click();const selected=await page.locator('#hand [aria-pressed=true]').getAttribute('data-card');
 await page.reload();assert.equal(await page.locator('#hand [aria-pressed=true]').getAttribute('data-card'),selected);
 if(await enabled.count()>1){await enabled.nth(1).click();assert.notEqual(await page.locator('#hand [aria-pressed=true]').getAttribute('data-card'),selected);}
 await page.setViewportSize({width:844,height:390});assert.equal(await page.locator('#hand [aria-pressed=true]').count(),1);
 const before=E.restore(await read());await page.locator('#primary-action').click();assert.equal(E.restore(await read()).hands[0].length,before.hands[0].length-1);
 results.push({check:'selection, correction, reload, rotation, explicit play',passed:true});
 await fixture('loneDiscard');assert.equal(await page.locator('#hand .unplayable').count(),0);assert.equal(await page.locator('#hand .card:not(:disabled)').count(),6);
 for(const [name,selection] of [['forcedBid',{bid:'pass'}],['bid2',{bid:E.card(E.restore(F.bid2).upcard).suit}],['follow',{card:E.restore(F.follow).hands[0].find(id=>!E.legalCards(E.restore(F.follow).hands[0],E.restore(F.follow).trick,E.restore(F.follow).trump).includes(id))}]]){
  await seed(page,{...F[name],selection});assert.ok(await page.locator('#primary-action').isDisabled());
 }
 results.push({check:'lone dealer discard and invalid restored selections',passed:true});
 await page.locator('#menu-button').click();const paused=JSON.stringify(await read());await page.clock.runFor(10000);assert.equal(JSON.stringify(await read()),paused);
 for(const kind of ['help','settings','bidding','new']){
  if(kind!=='help'){await page.locator('#close-panel').click();await page.locator('#menu-button').click();}
  await page.locator(`[data-panel="${kind}"]`).click();assert.ok(await page.locator('#panel').evaluate(e=>e.open));
  const box=await page.locator('#close-panel').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=390);
 }
 await page.locator('#keep-playing').click();assert.equal(await page.locator(':focus').getAttribute('id'),'menu-button');
 await page.locator('#menu-button').click();await page.locator('[data-panel=settings]').click();await page.locator('#pace').selectOption('steady');await page.locator('#bower-labels').selectOption('no');await page.locator('#save-settings').click();await page.reload();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ai-euchre-settings-v1')).bowerLabels),false);
 results.push({check:'menus pause bots, keep-match cancel, focus restoration, settings persist',passed:true});
 await fixture('bid1');await page.locator('[data-bid=pass]').focus();await page.keyboard.press('Space');assert.equal(await page.locator('[data-bid=pass]').getAttribute('aria-pressed'),'true');
 await page.locator('#primary-action').focus();await page.keyboard.press('Enter');assert.equal((await read()).actions.at(-1).type,'bid');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.card').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
 results.push({check:'keyboard and reduced motion',passed:true});
 // Play an entire match by clicking exactly the controls a person uses.
 await fixture('bid1');let moves=0;
 while(true){
  const saved=await read(),s=E.restore(saved);if(s.phase==='matchOver')break;assert.ok(++moves<2000);
  if(['trick','handOver','redeal'].includes(s.phase)){await page.locator('#primary-action').click();continue;}
  if(s.turn!==0){await page.clock.runFor(1600);continue;}
  const action=E.chooseAction(E.viewFor(s,0));
  if(action.type==='bid'){await page.locator(`[data-bid="${action.suit||'pass'}"]`).click();if(action.alone)await page.locator('#alone').click();}
  else await page.locator(`[data-card="${action.card}"]`).click();
  await page.locator('#primary-action').click();
 }
 assert.match(await page.locator('#instruction').innerText(),/win/);await page.reload();assert.equal(E.restore(await read()).phase,'matchOver');
 await page.locator('#primary-action').click();assert.deepEqual(E.restore(await read()).score,[0,0]);
 results.push({check:'complete browser match, restore final result, play again',iterations:moves,passed:true});
 // A corrupted main save falls back to a valid earlier position.
 await seed(page,'{broken',F.discard);assert.match(await page.locator('#storage-note').innerText(),/Recovered/);assert.equal(await page.locator('#hand .card').count(),6);
 const restricted=await browser.newContext();await restricted.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Blocked','SecurityError');};});
 const blocked=await restricted.newPage();blocked.on('pageerror',e=>errors.push(e.message));await blocked.goto(URL);assert.match(await blocked.locator('#storage-note').innerText(),/cannot save/);await restricted.close();
 assert.deepEqual(errors,[]);results.push({check:'save recovery and unavailable storage',passed:true});
}finally{await browser.close();}
}
const chrome=await chromium.launch({channel:process.env.CHROME_CHANNEL||'chrome'});
try{
 const context=await chrome.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await context.newPage();
 await page.clock.install();await page.clock.pauseAt(new Date());await page.goto(URL);
 await enableFixtures(page);
 const load=async(name)=>seed(page,F[name]);
 const cdp=await context.newCDPSession(page);
 async function touch(selector,{hold=100,drift=0,cancel=false,extra=false}={}){
  const locator=page.locator(selector).first();await locator.scrollIntoViewIfNeeded();const r=await locator.boundingBox(),x=r.x+r.width/2,y=r.y+12;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
  await new Promise(resolve=>setTimeout(resolve,hold));
  if(extra)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1},{x:x+20,y:y+40,id:2}]});
  if(drift)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-drift,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
 }
 await load('play');await touch('#hand .card:not(:disabled)',{hold:6500});assert.equal(await page.locator('#hand [aria-pressed=true]').count(),1);
 const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 let n=(await read()).actions.length;await touch('#primary-action',{hold:6500,drift:24});assert.equal((await read()).actions.length,n+1);
 await load('play');await touch('#hand .card:not(:disabled)',{drift:20});assert.equal(await page.locator('#hand [aria-pressed=true]').count(),0);
 await touch('#hand .card:not(:disabled)');n=(await read()).actions.length;
 await touch('#primary-action',{drift:70});assert.equal((await read()).actions.length,n);
 await touch('#primary-action',{cancel:true});assert.equal((await read()).actions.length,n);
 await touch('#primary-action',{extra:true});assert.equal((await read()).actions.length,n);
 await touch('#menu-button',{hold:6500,drift:24});assert.ok(await page.locator('#panel').evaluate(e=>e.open));
 await touch('#close-panel',{hold:6500,drift:24});assert.equal(await page.locator('#panel').evaluate(e=>e.open),false);assert.equal((await read()).actions.length,n);
 assert.equal(await page.evaluate(()=>getSelection().toString()),'');
 results.push({check:'native Chromium touch: long holds, 24px button drift, card drift, drag, cancel, extra finger, modal tap-through',passed:true});
 await context.close();
 const offline=await chrome.newContext({viewport:{width:390,height:740}}),op=await offline.newPage();await op.goto(URL);
 await op.evaluate(()=>navigator.serviceWorker.ready);await op.reload();
 const cache=await op.evaluate(async()=>{const c=await caches.open('ai-euchre-v1');return(await c.keys()).map(r=>r.url);});assert.equal(cache.length,12);
 await offline.setOffline(true);await op.reload();await op.locator('[data-bid=pass]').click();assert.equal(await op.locator('#primary-action').innerText(),'Confirm pass');
 await op.locator('#menu-button').click();await op.locator('[data-panel=help]').click();assert.match(await op.locator('#panel-body').innerText(),/left bower/);
 results.push({check:'offline reload, bidding, help and cached icons',cacheEntries:cache.length,passed:true});await offline.close();
}finally{await chrome.close();}
await fs.writeFile(new URLConstructor(process.env.TOUCH_ONLY?'touch-results.json':'results.json',out),JSON.stringify({checkedAt:new Date().toISOString(),url:URL,results,errors},null,2));
console.log(JSON.stringify(results,null,2));
