import assert from 'node:assert/strict';
import {webkit,url,artifacts} from './support.mjs';
const browser=await webkit.launch(),errors=[];
try {
  const page=await browser.newPage({viewport:{width:390,height:740},serviceWorkers:'block'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('../../previews/hearts-celebrations/',url).href);
  for(const [width,height] of [[390,740],[844,390],[768,1024]]) {
    await page.setViewportSize({width,height});await page.waitForTimeout(100);
    let previous;
    for(let run=0;run<2;run++) {
      await page.locator('button[data-kind="win"]').click();
      const lanterns=await page.locator('.celebration-lantern').evaluateAll(nodes=>nodes.map(el=>({width:parseFloat(el.style.width),...el.getAnimations()[0].effect.getTiming()})));
      assert.equal(lanterns.length,width<500?7:9);
      assert(Math.max(...lanterns.map(l=>l.width))-Math.min(...lanterns.map(l=>l.width))>15,'Visible size variety');
      assert(Math.max(...lanterns.map(l=>l.duration))-Math.min(...lanterns.map(l=>l.duration))>1000,'Visible speed variety');
      assert(lanterns.every(l=>l.duration+l.delay<4600),'Every lantern finishes inside the celebration');
      if(previous)assert.notDeepEqual(lanterns,previous,'Replay makes a fresh mix');previous=lanterns;
      if(run===0) {
        await page.waitForTimeout(1500);await page.screenshot({path:`${artifacts}/lantern-variety-${width}x${height}.png`});
      } else {
        await page.emulateMedia({reducedMotion:'reduce'});
        await page.waitForFunction(()=>document.querySelector('#celebration-scene').dataset.motion==='off');
        const still=await page.locator('.celebration-lantern').evaluateAll(nodes=>nodes.map(el=>({width:parseFloat(el.style.width),box:el.getBoundingClientRect().toJSON(),animations:el.getAnimations().length})));
        assert.deepEqual(still.map(l=>l.width),lanterns.map(l=>l.width),'Reduced Motion preserves the mix');
        assert(still.every(l=>!l.animations && l.box.x>=0 && l.box.right<=width && l.box.y>=0 && l.box.bottom<=height));
      }
      await page.locator('#celebration-skip').click();
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.waitForFunction(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }
  assert.deepEqual(errors,[]);console.log('PASS: lantern size/speed variety, fresh replays, bounded duration and stable Reduced Motion in three sizes.');
} finally { await browser.close(); }
