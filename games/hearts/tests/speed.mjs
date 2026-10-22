import {webkit,E,KEY,url,createFixtures,artifacts} from './support.mjs';
import assert from 'node:assert/strict';
const fixtures=createFixtures(),PREFS='ai-hearts-settings-v2';
let opening;
for(let seed=1;seed<100&&!opening;seed++){
 let n=seed;const random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
 const deal=E.newGame(random),state=E.begin(E.pass(deal,deal.hands.map((_,p)=>E.choosePass(E.viewFor(deal,p)))));
 if(state.turn===0)opening=state;
}
assert(opening);const afterForced=E.play(opening,0,E.legalCards(opening,0)[0]);
const browser=await webkit.launch();
const read=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)).game,KEY);
async function open(state,pace='slow',language='en',reducedMotion='no-preference'){
 const context=await browser.newContext({viewport:{width:390,height:740},serviceWorkers:'block',reducedMotion});
 const page=await context.newPage();page.on('pageerror',e=>{throw e;});
 await page.addInitScript(({KEY,PREFS,state,pace,language})=>{
  if(!localStorage.getItem(KEY))localStorage.setItem(KEY,JSON.stringify({version:2,game:state,selected:[]}));
  if(!localStorage.getItem(PREFS))localStorage.setItem(PREFS,JSON.stringify({pace,language,tapToPlay:false}));
 },{KEY,PREFS,state,pace,language});
 const now=new Date('2026-10-22T12:00:00Z');await page.clock.install({time:now});await page.clock.pauseAt(now);await page.goto(url);
 return {context,page};
}
try{
 for(const [pace,forced,opponent,review,collection] of [['slow',3000,1500,1200,1000],['normal',2000,1000,900,850],['fast',1000,350,350,400]]){
  {
   const {context,page}=await open(opening,pace);
   assert.equal(await page.locator('#action-detail').innerText(),`${forced/1000}s`);
   await page.clock.runFor(forced-1);assert.deepEqual(await read(page),opening);
   await page.clock.runFor(1);assert.deepEqual(await read(page),afterForced);
   await page.clock.runFor(opponent-1);assert.deepEqual(await read(page),afterForced);
   await page.clock.runFor(1);assert.deepEqual(await read(page),E.play(afterForced,afterForced.turn,E.choosePlay(E.viewFor(afterForced,afterForced.turn))));await context.close();
  }
  {
   const {context,page}=await open(fixtures.trick,pace);
   await page.clock.runFor(review-1);assert.equal(await page.locator('.trick-flight-card').count(),0);
   await page.clock.runFor(1);assert.equal(await page.locator('.trick-flight-card').count(),4);
   assert(await page.locator('.trick-flight-card').first().evaluate((el,duration)=>el.getAnimations()[0].effect.getTiming().duration===duration,collection));
   await page.locator('#menu-button').click();await page.clock.runFor(10000);assert.deepEqual(await read(page),fixtures.trick);
   await page.locator('#menu-dialog .dialog-action').click();await page.evaluate(()=>document.getAnimations().forEach(a=>a.finish()));
   await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).game.phase!=='trick-end',KEY);
   assert.deepEqual(await read(page),E.collect(fixtures.trick));await context.close();
  }
  {
   const {context,page}=await open(fixtures.trick,pace,'en','reduce');
   await page.clock.runFor(review);assert.deepEqual(await read(page),E.collect(fixtures.trick));await context.close();
  }
 }
 for(const language of ['en','es','vi']){
  const {context,page}=await open(opening,'slow',language);
  await page.clock.runFor(1400);await page.locator('#menu-button').click();await page.locator('#menu-pace').selectOption('fast');
  assert.equal(await page.locator('#pace').inputValue(),'fast');assert.match(await page.locator('#pace-note').innerText(),/1s/);
  await page.clock.runFor(10000);assert.deepEqual(await read(page),opening);
  await page.screenshot({path:`${artifacts}/speed-menu-${language}.png`});
  await page.locator('#menu-dialog .dialog-action').click();await page.clock.runFor(500);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(10000);assert.deepEqual(await read(page),opening);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(499);assert.deepEqual(await read(page),opening);await page.clock.runFor(1);assert.deepEqual(await read(page),afterForced);
  await page.locator('#menu-button').click();await page.locator('#settings-button').click();await page.locator('#pace').selectOption('normal');
  assert.equal(await page.locator('#menu-pace').inputValue(),'normal');
  await page.reload();assert.equal(await page.locator('#menu-pace').inputValue(),'normal');assert.equal(await page.locator('#tap-to-play').inputValue(),'off');
  await context.close();
 }
 for(const state of [fixtures.allPlayable,fixtures.received,fixtures.pass]){
  const {context,page}=await open(state,'fast');
  if(state===fixtures.allPlayable)await page.locator('#hand .playable').first().click({position:{x:20,y:20}});
  await page.clock.runFor(10000);assert.deepEqual(await read(page),state,'Quick preserves deliberate choices and received-card review');await context.close();
 }
 {
  const {context,page}=await open(opening,'invalid');assert.equal(await page.locator('#menu-pace').inputValue(),'slow');await context.close();
 }
 console.log('PASS: all speed timers, collection motion/reduced motion, paused menu/background, mid-countdown changes, synchronized/persistent controls, three languages, deliberate choices and invalid preference fallback.');
}finally{await browser.close();}
