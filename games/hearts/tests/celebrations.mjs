import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {webkit,E,createFixtures,url,KEY,artifacts} from './support.mjs';
const fixtures=createFixtures(), errors=[], report=[];
const browser=await webkit.launch();
const clone=x=>structuredClone(x);
function rotate(state,player){
  const s=clone(state),p=n=>(n-player+4)%4;
  s.history=s.history.map(t=>({...t,winner:p(t.winner),cards:t.cards.map(c=>({...c,player:p(c.player)}))}));
  s.handPoints=s.handPoints.map((_,i)=>state.handPoints[(i+player)%4]);
  const before=state.result.before.map((_,i)=>state.result.before[(i+player)%4]);
  s.result=E.scoreRound(before,s.handPoints);s.scores=s.result.totals;s.phase=s.result.winner===null?'hand-end':'game-over';
  assert(E.validate(s));return s;
}
const moon=rotate(fixtures.moon,fixtures.moon.result.moon);
moon.result=E.scoreRound([0,0,0,0],moon.handPoints);moon.scores=moon.result.totals;moon.phase='hand-end';assert(E.validate(moon));
const clean=rotate(fixtures.handEnd,fixtures.handEnd.handPoints.findIndex(n=>n===0));
clean.result=E.scoreRound([0,0,0,0],clean.handPoints);clean.scores=clean.result.totals;clean.phase='hand-end';assert(E.validate(clean));
function beforeResult(state){
  const s=clone(state),last=s.history.pop();s.trick=last.cards;s.handPoints[last.winner]-=last.points;
  s.scores=[...state.result.before];s.result=null;s.phase='trick-end';s.turn=null;
  assert(E.validate(s));assert.deepEqual(E.collect(s),state);return s;
}
async function load(state,opts={}){
  const context=await browser.newContext({viewport:{width:390,height:740},isMobile:true,hasTouch:true,serviceWorkers:'block',...opts});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({state,KEY})=>{
    if(!localStorage.getItem(KEY))localStorage.setItem(KEY,JSON.stringify({version:2,game:state,selected:[]}));
    localStorage.setItem('ai-hearts-settings-v2',JSON.stringify({language:'en',pace:'fast',sound:false}));
  },{state,KEY});
  await page.goto(url);return {context,page};
}
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)).game,KEY);}
try{
  for(const [kind,state] of [['win',fixtures.win],['moon',moon],['clean',clean]]){
    const {page,context}=await load(beforeResult(state));
    await page.waitForFunction(()=>document.querySelector('#celebration-dialog').open,{},{timeout:9000});
    assert.equal(await page.locator('#celebration-dialog').getAttribute('data-kind'),kind);
    assert.deepEqual(await saved(page),state);
    const count=await page.locator('#celebration-scene > *').count();assert(count>15);
    // Saved-game reload must not turn a finished result into a fresh celebration.
    await page.reload();assert.equal(await page.locator('#celebration-dialog').evaluate(e=>e.open),false);
    assert.deepEqual(await saved(page),state);
    // Settings re-render should retain static results, with no replay.
    await page.locator('#menu-button').click();await page.locator('#settings-button').click();
    await page.locator('#language').selectOption('es');
    await page.locator('#settings-dialog [data-close].dialog-action').click();
    assert.equal(await page.locator('#celebration-dialog').evaluate(e=>e.open),false);
    report.push({check:'real final-trick trigger, unchanged scores, restored result and rerender',kind});
    await context.close();
  }
  for(const [name,state] of [['opponent-win',fixtures.lose],['tie',fixtures.tie]]){
    const {page,context}=await load(beforeResult(state),{reducedMotion:'reduce'});
    await page.waitForFunction(key=>['game-over','hand-end'].includes(JSON.parse(localStorage.getItem(key)).game.phase),KEY);
    assert.equal(await page.locator('#celebration-dialog').evaluate(e=>e.open && e.dataset.kind==='win'),false);
    report.push({check:'no false victory',name});await context.close();
  }
  const {page,context}=await load(fixtures.win);
  for(const [width,height] of [[375,667],[844,390],[768,1024],[1024,640]]){
    await page.setViewportSize({width,height});
    await page.waitForTimeout(150);
    for(const language of ['en','es','vi'])for(const kind of ['win','moon','clean']){
      await page.evaluate(({kind,language})=>{
        HeartsText.set(language);
        document.querySelector('#celebration-skip').textContent=HeartsText.t('seeScores');
        HeartsCelebration.show({kind,title:HeartsText.t(kind==='win'?'youWon':kind==='moon'?'youShotMoon':'cleanHand'),detail:HeartsText.t(kind==='moon'?'othersGet26':kind==='clean'?'cleanHandDetail':'lowestScore',{n:21})});
      },{kind,language});
      await page.waitForTimeout(1700);
      const metrics=await page.evaluate(()=>{
        const d=document.querySelector('#celebration-dialog'),b=document.querySelector('#celebration-skip').getBoundingClientRect(),title=document.querySelector('#celebration-title').getBoundingClientRect();
        return {open:d.open,width:innerWidth,height:innerHeight,scrollWidth:d.scrollWidth,scrollHeight:d.scrollHeight,clientHeight:d.clientHeight,buttonBottom:b.bottom,buttonHit:document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.id,titleTop:title.top,animations:document.getAnimations().length};
      });
      assert(metrics.open,JSON.stringify({kind,language,width,height,metrics}));assert(metrics.scrollWidth<=width);assert(metrics.scrollHeight<=metrics.clientHeight+1);
      assert(metrics.buttonBottom<=height);assert.equal(metrics.buttonHit,'celebration-skip');assert(metrics.titleTop>=0);
      if(language==='en')await page.screenshot({path:`${artifacts}/celebration-${kind}-${width}x${height}.png`});
      await page.locator('#celebration-skip').click();
      assert.equal(await page.locator('#celebration-scene > *').count(),0);
      report.push({check:'responsive render and dismissal',kind,language,width,height});
    }
  }
  await page.setViewportSize({width:390,height:740});
  await page.waitForTimeout(150);
  await page.evaluate(()=>HeartsCelebration.show({kind:'moon',title:'Moon',detail:'Static'}));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.querySelector('#celebration-scene').dataset.motion==='off');
  assert.equal(await page.locator('#celebration-scene').getAttribute('data-motion'),'off');
  assert.equal(await page.locator('.celebration-heart').count(),13);assert.equal(await page.locator('.celebration-queen').count(),1);
  assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
  await page.screenshot({path:`${artifacts}/celebration-reduced-motion.png`});
  await page.locator('#celebration-skip').click();
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForFunction(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
  await page.evaluate(()=>HeartsCelebration.show({kind:'win',title:'Win',detail:'Resize'}));
  await page.setViewportSize({width:740,height:390});
  await page.waitForFunction(()=>!document.querySelector('#celebration-dialog').open);
  await page.evaluate(()=>HeartsCelebration.show({kind:'win',title:'Win',detail:'Background'}));
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(4900);assert.equal(await page.locator('#celebration-dialog').evaluate(e=>e.open),true);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>!document.querySelector('#celebration-dialog').open,{},{timeout:6000});
  await page.locator('.result-continue').click();assert.equal((await saved(page)).phase,'pass');
  assert.equal(await page.locator('#celebration-scene > *').count(),0);
  report.push({check:'Reduced Motion change, rotation, background pause/resume, natural completion and new game'});
  await context.close();
  const touch=await load(fixtures.win);
  await touch.page.clock.install();
  await touch.page.evaluate(()=>HeartsCelebration.show({kind:'win',title:'You won!',detail:'Slow press'}));
  const button=touch.page.locator('#celebration-skip'),box=await button.boundingBox();
  const point={x:box.x+30,y:box.y+8};
  const pointer=(type,point)=>button.evaluate((el,{type,point})=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:1,isPrimary:true,clientX:point.x,clientY:point.y,buttons:type==='pointerup'?0:1})),{type,point});
  await pointer('pointerdown',point);await touch.page.clock.runFor(7000);
  assert.equal(await touch.page.locator('#celebration-dialog').evaluate(e=>e.open),true,'A long press prevents timed dismissal');
  const release={x:point.x,y:point.y-24};await pointer('pointermove',release);await pointer('pointerup',release);
  assert.equal(await touch.page.locator('#celebration-dialog').evaluate(e=>e.open),false);
  await button.evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1})));
  assert.deepEqual(await saved(touch.page),fixtures.win);
  await touch.page.evaluate(()=>HeartsCelebration.show({kind:'win',title:'You won!',detail:'Cancelled drag'}));
  await pointer('pointerdown',point);await pointer('pointermove',{x:point.x,y:point.y-80});await pointer('pointerup',{x:point.x,y:point.y-80});
  assert.equal(await touch.page.locator('#celebration-dialog').evaluate(e=>e.open),true,'Large drag cancels');
  await touch.page.keyboard.press('Escape');
  assert.equal(await touch.page.locator('#celebration-dialog').evaluate(e=>e.open),false);
  await touch.page.evaluate(()=>{
    HeartsCelebration.show({kind:'win',title:'First',detail:''});
    HeartsCelebration.show({kind:'moon',title:'Second',detail:''});
  });
  await touch.page.clock.runFor(100);
  assert.equal(await touch.page.locator('#celebration-dialog').evaluate(e=>e.open && e.dataset.kind==='moon'),true,'An earlier close event cannot dismiss the next scene');
  await pointer('pointerdown',point);
  await touch.page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await touch.page.clock.runFor(7000);
  assert.equal(await touch.page.locator('#celebration-dialog').evaluate(e=>e.open),true);
  await touch.page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await touch.page.clock.runFor(5000);
  assert.equal(await touch.page.locator('#celebration-dialog').evaluate(e=>e.open),false,'Backgrounding during a press clears stale pointer IDs and resumes the timer');
  await touch.context.close();
  report.push({check:'slow release beyond automatic duration, upward drift, duplicate click, cancelled drag, Escape, replacement scene'});
  assert.deepEqual(errors,[]);
  await fs.writeFile(`${artifacts}/celebrations.json`,JSON.stringify({report,errors,physicalDevice:false},null,2));
  console.log(`PASS: ${report.length} celebration checks; screenshots saved.`);
}finally{await browser.close();}
