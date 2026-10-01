import {chromium,webkit} from 'playwright';import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const E=createRequire(import.meta.url)('../engine.js'),KEY='ai-spades-game-v1',url=process.env.SPADES_URL||'http://127.0.0.1:8798/';
const F=JSON.parse(await fs.readFile(new URL('../output/playwright/fixtures.json',import.meta.url),'utf8'));
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),random=rng(50),initial={deck:E.shuffled(random),dealer:2,target:500};let s=E.start(initial);const actions=[];
while(s.phase!=='handOver'){const a=s.phase==='trick'?{type:'collect'}:E.chooseAction(E.viewFor(s,s.turn));actions.push(a);s=E.step(s,a);}
const endHand={version:1,initial,actions},lastTrick={...endHand,actions:actions.slice(0,-1)},results=[];
for(const [engine,kind,options] of [[chromium,'Chromium',{channel:'chrome'}],[webkit,'WebKit',process.env.WEBKIT_PATH?{executablePath:process.env.WEBKIT_PATH}:{}]]){
 const browser=await engine.launch(options);
 try{
  for(const [name,record,phase] of [['Play again',F.matchOver,'bid'],['Deal next hand',endHand,'bid'],['See hand score',lastTrick,'handOver']])for(const input of ['mouse','keyboard','touch']){
   const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,serviceWorkers:'block'});await context.addInitScript(r=>localStorage.setItem('ai-spades-game-v1',JSON.stringify(r)),record);const page=await context.newPage();await page.clock.install();await page.clock.pauseAt(new Date());await page.goto(url);
   const button=page.locator('#primary-action');const activate=async()=>{if(input==='keyboard'){await button.focus();await page.keyboard.press('Enter');}else if(input==='touch')await button.tap();else await button.click();};
   await activate();await page.clock.runFor(50);await activate();const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY),after=E.restore(saved);
   assert.equal(after.phase,phase,`${kind} ${name} ${input} phase`);if(phase==='bid')assert.equal(after.bids[0],null,`${kind} ${name} ${input} unchosen bid`);
   const n=saved.actions.length;await page.clock.runFor(500);await activate();assert.equal((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY)).actions.length,n+1,`${kind} ${input}: later deliberate press works`);
   results.push({browser:kind,transition:name,input,passed:true});await context.close();
  }
 }finally{await browser.close();}
}
await fs.writeFile(new URL('../output/playwright/activation-results.json',import.meta.url),JSON.stringify(results,null,2));console.log(`${results.length} repeated-activation and deliberate-retry checks pass.`);
