import {webkit,chromium} from 'playwright';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const E=createRequire(import.meta.url)('../engine.js');
const url=process.env.SPADES_URL||'http://127.0.0.1:8798/',KEY='ai-spades-game-v1',out=new URL('../output/playwright/',import.meta.url);
await fs.mkdir(out,{recursive:true});
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function makeFixtures(){
 const found={};
 for(let seed=1;seed<30;seed++){
  const random=rng(seed),initial={deck:E.shuffled(random),dealer:3,target:250};let s=E.start(initial);const actions=[];
  while(s.phase!=='matchOver'){
   const record=()=>structuredClone({version:1,initial,actions});
   if(s.phase==='bid'&&s.turn===0)found.bid||=record();
   if(s.phase==='play'&&s.turn===0){found.play||=record();if(!s.broken&&!s.trick.length&&s.hands[0].some(id=>E.card(id).suit==='S'))found.locked||=record();if(s.broken)found.broken||=record();if(s.hands[0].length>1&&E.legalCards(s.hands[0],s.trick,s.broken).length<s.hands[0].length)found.follow||=record();}
   if(s.phase==='play'&&s.bids.some(b=>b===0))found.nil||=record();
   if(s.phase==='trick'){found.trick||=record();if(s.bids[s.turn]===0)found.nilFailed||=record();}
   if(s.phase==='handOver'){found.handOver||=record();if(s.result.some(r=>r.bagPenalty))found.bagPenalty||=record();}
   const a=s.phase==='trick'?{type:'collect'}:s.phase==='handOver'?{type:'nextHand',deck:E.shuffled(random)}:E.chooseAction(E.viewFor(s,s.turn));
   if(seed%3===0&&s.phase==='bid'&&s.turn===0)a.bid=0;
   actions.push(a);s=E.step(s,a);
  }
  found.matchOver||=structuredClone({version:1,initial,actions});if(Object.keys(found).length===11)break;
 }
 return found;
}
const F=makeFixtures();assert.equal(Object.keys(F).length,11);F.bidNil={...F.bid,selection:{bid:0,card:null}};
await fs.writeFile(new URL('fixtures.json',out),JSON.stringify(F));
async function enableFixtures(page){await page.addInitScript(key=>{if(!window.name.startsWith('spades-fixture:'))return;const data=JSON.parse(window.name.slice(15));window.name='';localStorage.setItem(key,data.main);if(data.backup)localStorage.setItem(key+'-backup',data.backup);else localStorage.removeItem(key+'-backup');},KEY);}
async function seed(page,record,backup=null){await page.evaluate(data=>{window.name='spades-fixture:'+JSON.stringify(data);},{main:typeof record==='string'?record:JSON.stringify(record),backup:backup?JSON.stringify(backup):null});await page.reload();}
const results=[],errors=[];
if(!process.env.TOUCH_ONLY){
 const b=await webkit.launch(process.env.WEBKIT_PATH?{executablePath:process.env.WEBKIT_PATH}:{});
 try{
  const page=await b.newPage({viewport:{width:390,height:740},serviceWorkers:'block'});await enableFixtures(page);page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.clock.pauseAt(new Date());await page.goto(url);
  const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  async function fixture(name){await seed(page,F[name]);assert.equal(E.restore(await read()).phase,E.restore(F[name]).phase);}
  const sizes=[[320,568],[375,667],[390,740],[430,932],[667,375],[844,390],[768,1024],[1024,768],[1366,768]];let count=0;
  for(const [width,height] of sizes){await page.setViewportSize({width,height});for(const name of ['bid','bidNil','locked','follow','broken','nil','nilFailed','trick','handOver','bagPenalty','matchOver']){
   await fixture(name);
   const g=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,cards:[...document.querySelectorAll('#hand .card')].map(c=>{const r=c.getBoundingClientRect();return {id:c.dataset.card,left:r.left,right:r.right,top:r.top,width:r.width,exposed:document.elementFromPoint(r.left+r.width/2,r.top+10)?.closest('button')===c};})}));
   assert.ok(g.scrollWidth<=width+1,`${name}: horizontal overflow at ${width}`);
   for(const c of g.cards){assert.ok(c.left>=0&&c.right<=width+1,`${name}: card outside viewport`);assert.ok(c.width>=40,`Card too narrow: ${c.width}`);}
   // On visible rows, a hit at the rank/suit edge must reach the intended card.
   for(const c of g.cards.filter(c=>c.top>=0&&c.top+10<height))assert.ok(c.exposed,`${name}: ${c.id} rank obscured at ${width}x${height}`);
   if((width===390&&['bidNil','follow','nilFailed','bagPenalty'].includes(name))||(width===844&&name==='trick')||(width===768&&name==='bid')||(width===1366&&name==='follow'))await page.screenshot({path:new URL(`${name}-${width}x${height}.png`,out).pathname,fullPage:true});count++;
  }}
  results.push({check:'WebKit game-state layouts and exposed card hit targets',passed:count,viewports:sizes});
  await page.setViewportSize({width:390,height:740});await fixture('bid');assert.equal(await page.locator('#bid-value').innerText(),'3');
  await page.locator('#bid-up').click();await page.locator('#bid-up').click();assert.equal(await page.locator('#bid-value').innerText(),'5');await page.reload();assert.equal(await page.locator('#bid-value').innerText(),'5');
  await page.locator('#bid-nil').click();assert.match(await page.locator('#detail').innerText(),/failure −100/);await page.locator('#bid-up').click();assert.equal(await page.locator('#bid-value').innerText(),'1');await page.locator('#bid-nil').click();await page.locator('#primary-action').click();assert.equal(E.restore(await read()).bids[0],0);
  results.push({check:'bid change, reload, explicit Nil warning, correction and confirmation',passed:true});
  await fixture('play');let cards=page.locator('#hand .card:not(:disabled)');await cards.first().click();const selected=await page.locator('[aria-pressed=true][data-card]').getAttribute('data-card');await page.reload();assert.equal(await page.locator('[aria-pressed=true][data-card]').getAttribute('data-card'),selected);
  if(await cards.count()>1){await cards.nth(1).click();assert.notEqual(await page.locator('[aria-pressed=true][data-card]').getAttribute('data-card'),selected);}
  await page.setViewportSize({width:844,height:390});assert.equal(await page.locator('[aria-pressed=true][data-card]').count(),1);const n=E.restore(await read()).hands[0].length;await page.locator('#primary-action').click();assert.equal(E.restore(await read()).hands[0].length,n-1);
  await page.locator('#menu-button').click();const paused=JSON.stringify(await read());await page.clock.runFor(10000);assert.equal(JSON.stringify(await read()),paused);
  for(const kind of ['help','settings','bidding','new']){if(kind!=='help'){await page.locator('#close-panel').click();await page.locator('#menu-button').click();}await page.locator(`[data-panel=${kind}]`).click();const r=await page.locator('#close-panel').boundingBox();assert.ok(r.y>=0&&r.y+r.height<=390);}
  await page.locator('#keep-playing').click();assert.equal(await page.locator(':focus').getAttribute('id'),'menu-button');
  await page.locator('#menu-button').click();await page.locator('[data-panel=settings]').click();await page.locator('#target').selectOption('500');await page.locator('#pace').selectOption('steady');await page.locator('#save-settings').click();assert.equal(E.restore(await read()).target,250);
  await page.reload();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ai-spades-settings-v1')).target),500);
  results.push({check:'card correction/reload/rotation, menus pause bots, focus return, settings for next match',passed:true});
  await fixture('bid');await page.locator('#bid-up').focus();await page.keyboard.press('Space');assert.equal(await page.locator('#bid-value').innerText(),'4');await page.locator('#primary-action').focus();await page.keyboard.press('Enter');assert.equal(E.restore(await read()).bids[0],4);
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.card').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');results.push({check:'keyboard bidding and reduced motion',passed:true});
  // Full match played only through visible buttons and the computer timers.
  await fixture('bid');let moves=0;
  while(true){await page.clock.runFor(550);const s=E.restore(await read());if(s.phase==='matchOver')break;assert.ok(++moves<5000);if(['trick','handOver'].includes(s.phase)){await page.locator('#primary-action').click();continue;}if(s.turn!==0){await page.clock.runFor(1600);continue;}
   const a=E.chooseAction(E.viewFor(s,0));if(a.type==='bid'){let current=Number(await page.locator('#bid-value').innerText());if(a.bid===0)await page.locator('#bid-nil').click();else{while(current<a.bid){await page.locator('#bid-up').click();current++;}while(current>a.bid){await page.locator('#bid-down').click();current--;}}}else await page.locator(`[data-card="${a.card}"]`).click({position:{x:12,y:12}});await page.locator('#primary-action').click();
  }
  await page.reload();assert.equal(E.restore(await read()).phase,'matchOver');await page.locator('#primary-action').click();assert.equal(E.restore(await read()).target,500);assert.deepEqual(E.restore(await read()).bags,[0,0]);results.push({check:'complete browser match, restored final result, play again at new target',iterations:moves,passed:true});
  await seed(page,'{broken',F.play);assert.match(await page.locator('#storage-note').innerText(),/Recovered/);
  const follow=E.restore(F.follow),illegal=follow.hands[0].find(c=>!E.legalCards(follow.hands[0],follow.trick,follow.broken).includes(c));await seed(page,{...F.follow,selection:{card:illegal,bid:99}});assert.ok(await page.locator('#primary-action').isDisabled());
  await fixture('nilFailed');assert.ok(await page.locator('.nil-failed').count()>0);await fixture('bagPenalty');assert.match(await page.locator('#score-detail').innerText(),/Bag penalty/);
  const restricted=await b.newContext();await restricted.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Blocked','SecurityError');};});const denied=await restricted.newPage();denied.on('pageerror',e=>errors.push(e.message));await denied.goto(url);assert.match(await denied.locator('#storage-note').innerText(),/cannot save/);await restricted.close();
  results.push({check:'save fallback, invalid selection, nil failure, bag penalty, denied storage',passed:true});assert.deepEqual(errors,[]);
 }finally{await b.close();}
}
const chrome=await chromium.launch({channel:process.env.CHROME_CHANNEL||'chrome'});
try{
 const context=await chrome.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await context.newPage();await enableFixtures(page);await page.clock.install();await page.clock.pauseAt(new Date());await page.goto(url);const cdp=await context.newCDPSession(page);
 async function touch(selector,{hold=80,drift=0,cancel=false,extra=false}={}){const el=page.locator(selector).first();await el.scrollIntoViewIfNeeded();const r=await el.boundingBox(),x=r.x+r.width/2,y=r.y+12;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await new Promise(resolve=>setTimeout(resolve,hold));if(extra)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1},{x:x+20,y:y+40,id:2}]});if(drift)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-drift,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});}
 const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 await seed(page,F.bid);await touch('#bid-up',{hold:6500,drift:24});assert.equal(await page.locator('#bid-value').innerText(),'4');await touch('#bid-nil');assert.equal(await page.locator('#bid-value').innerText(),'Nil');await touch('#primary-action',{hold:6500,drift:24});assert.equal((await read()).actions.length,1);assert.equal(E.restore(await read()).bids[0],0);
 await seed(page,F.play);await touch('#hand .card:not(:disabled)',{hold:6500});assert.equal(await page.locator('[data-card][aria-pressed=true]').count(),1);let n=(await read()).actions.length;await touch('#primary-action',{hold:6500,drift:24});assert.equal((await read()).actions.length,n+1);
 await seed(page,F.play);await touch('#hand .card:not(:disabled)',{drift:20});assert.equal(await page.locator('[data-card][aria-pressed=true]').count(),0);await touch('#hand .card:not(:disabled)');n=(await read()).actions.length;
 for(const options of [{drift:70},{cancel:true},{extra:true}]){await touch('#primary-action',options);assert.equal((await read()).actions.length,n);}
 await touch('#menu-button',{hold:1200,drift:24});assert.ok(await page.locator('#panel').evaluate(d=>d.open));await touch('#close-panel',{hold:1200,drift:24});assert.equal(await page.locator('#panel').evaluate(d=>d.open),false);assert.equal((await read()).actions.length,n);assert.equal(await page.evaluate(()=>getSelection().toString()),'');
 results.push({check:'native Chromium touch: real 6.5s holds, 24px button drift, bid/Nil confirmation, card drift, large drag, cancellation, extra finger, modal tap-through',passed:true});await context.close();
 const offline=await chrome.newContext(),op=await offline.newPage();await op.goto(url);await op.evaluate(()=>navigator.serviceWorker.ready);await op.reload();const count=await op.evaluate(async()=>{const c=await caches.open('ai-spades-v1');return(await c.keys()).length;});assert.equal(count,12);await offline.setOffline(true);await op.reload();await op.locator('#bid-nil').click();assert.match(await op.locator('#primary-action').innerText(),/Confirm Nil/);await op.locator('#menu-button').click();await op.locator('[data-panel=help]').click();assert.match(await op.locator('#panel-body').innerText(),/failed Nil bidder/);results.push({check:'offline reload, bidding, help and all install assets',cacheEntries:count,passed:true});await offline.close();
}finally{await chrome.close();}
await fs.writeFile(new URL(process.env.TOUCH_ONLY?'touch-results.json':'results.json',out),JSON.stringify({checkedAt:new Date().toISOString(),url,results,errors},null,2));console.log(JSON.stringify(results,null,2));
