import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {webkit,artifacts,url} from './support.mjs';
const browser=await webkit.launch();const errors=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:740},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(new URL('../../previews/hearts-celebrations/',url).href);
 await page.screenshot({path:artifacts+'/preview-page-phone.png',fullPage:true});
 for(const [width,height] of [[390,740],[844,390],[768,1024]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(100);
  await page.locator('button[data-kind="moon"]').click();
  assert.equal(await page.locator('.celebration-heart').count(),13);
  assert(await page.locator('.celebration-queen').evaluate(el=>{const expected=document.createElement('div');expected.innerHTML=cardSVG('Q','S');const paths=node=>[...node.querySelectorAll('path')].map(p=>[p.getAttribute('d'),p.getAttribute('transform')]);return JSON.stringify(paths(el))===JSON.stringify(paths(expected));}),'The opening card must use the real queen of spades renderer');
  assert((await page.locator('.celebration-queen').boundingBox()).width>=120);
  assert((await page.locator('.celebration-heart').first().boundingBox()).width>=55);
  // Pause the real scene to inspect exact key frames without racing its exit.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  for(const [stage,time] of [['queen',500],['flip',1200],['moon',1750],['spiral',3400],['assembling',4700],['heart',5900],['logo',7100]]){
   await page.evaluate(time=>document.getAnimations().forEach(a=>a.currentTime=time),time);
   const metrics=await page.evaluate(()=>{
    const nodes=['.celebration-queen','.celebration-moon','.celebration-logo'];
    const opacity=selector=>Number(getComputedStyle(document.querySelector(selector)).opacity);
    const bounds=document.querySelector('.celebration-logo').getBoundingClientRect();
    return {queen:opacity(nodes[0]),logo:opacity(nodes[2]),tiles:[...document.querySelectorAll('.moon-heart-tile')].map(el=>Number(getComputedStyle(el).opacity)),bounds:{left:bounds.left,top:bounds.top,right:bounds.right,bottom:bounds.bottom},scene:document.querySelector('#celebration-scene').getBoundingClientRect().toJSON(),buttonHit:(()=>{const b=document.querySelector('#celebration-skip').getBoundingClientRect();return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.id;})()};
   });
   assert.equal(metrics.buttonHit,'celebration-skip');
   assert(metrics.bounds.left>=0 && metrics.bounds.right<=width && metrics.bounds.top>=metrics.scene.top && metrics.bounds.bottom<=metrics.scene.bottom);
   if(stage==='queen'){assert.equal(metrics.queen,1);assert(metrics.tiles.every(o=>o===0));assert.equal(metrics.logo,0);}
   if(stage==='assembling'){assert(metrics.tiles.some(o=>o>0));assert(metrics.tiles.some(o=>o===0));}
   if(stage==='heart'){assert(metrics.tiles.every(o=>o===1));assert.equal(metrics.logo,0);}
   if(stage==='logo'){assert.equal(metrics.logo,1);assert.equal(await page.locator('.celebration-logo img').getAttribute('src'),'icons/icon.svg');}
   await page.screenshot({path:`${artifacts}/moon-${stage}-${width}x${height}.png`});
  }
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await page.locator('#celebration-skip').click();
 }
 for(const kind of ['win','clean']) {
  await page.locator(`button[data-kind="${kind}"]`).click();
  assert.equal(await page.locator('#celebration-dialog').getAttribute('data-kind'),kind);
  await page.locator('#celebration-skip').click();
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 await page.locator('button[data-kind="moon"]').click();
 assert.equal(await page.locator('.celebration-logo img').getAttribute('src'),'icons/icon.svg');
 assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
 await page.locator('#celebration-skip').click();
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.waitForFunction(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
 await page.locator('button[data-kind="moon"]').click();
 await page.waitForTimeout(7200);
 assert(await page.locator('#celebration-dialog').evaluate(el=>el.open),'The completed logo must remain visible before closing');
 await page.waitForFunction(()=>!document.querySelector('#celebration-dialog').open);
 assert.equal(await page.locator('#celebration-scene > *').count(),0);
 assert.equal(await page.evaluate(()=>localStorage.length),0,'Preview must not write game or settings data');
 assert.deepEqual(errors,[]);console.log('PASS: captured queen, flip, moon, spiral, assembly and exact-logo stages in three sizes.');
}finally{await browser.close();}
