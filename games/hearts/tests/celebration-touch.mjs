import assert from 'node:assert/strict';
import {chromium,KEY,url,createFixtures} from './support.mjs';
const browser=await chromium.launch();
try{
 const context=await browser.newContext({viewport:{width:390,height:740},hasTouch:true,isMobile:true,serviceWorkers:'block'}),page=await context.newPage(),state=createFixtures().win;
 await page.addInitScript(({KEY,state})=>localStorage.setItem(KEY,JSON.stringify({version:2,game:state,selected:[]})),{KEY,state});
 await page.goto(url);
 const cdp=await context.newCDPSession(page);
 for(const duration of [80,6500]){
  await page.evaluate(()=>HeartsCelebration.show({kind:'win',title:'You won!',detail:'Native touch'}));
  const b=await page.locator('#celebration-skip').boundingBox(),x=b.x+80,y=b.y+8;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  await page.waitForTimeout(duration);
  assert.equal(await page.locator('#celebration-dialog').evaluate(e=>e.open),true,'Held button pauses automatic dismissal');
  if(duration>1000)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-24}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(400);
  assert.equal(await page.locator('#celebration-dialog').evaluate(e=>e.open),false);
  assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).game,KEY),state,'Compatibility click must not activate Play again under the closed scene');
 }
 await page.evaluate(()=>HeartsCelebration.show({kind:'win',title:'You won!',detail:'Miss beside the button'}));
 const scene=await page.locator('#celebration-scene').boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:scene.x+scene.width/2,y:scene.y+scene.height*.8}]});
 await page.waitForTimeout(6500);
 assert.equal(await page.locator('#celebration-dialog').evaluate(e=>e.open),true,'A press beside the button also pauses dismissal');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForTimeout(400);
 assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).game,KEY),state);
 await page.locator('#celebration-skip').tap();
 await page.locator('.result-continue').tap();
 assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).game.phase,KEY),'pass','A separate deliberate tap still starts a new game');
 console.log('PASS: native Chromium quick tap and 6.5-second hold/drift dismiss once; a missed button press pauses dismissal; scores remain until a separate new tap.');
}finally{await browser.close();}
