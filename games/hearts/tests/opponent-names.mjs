import {webkit,chromium,E,I,KEY,url,createFixtures,artifacts} from './support.mjs';
import assert from 'node:assert/strict';
const fixtures=createFixtures(),PREFS='ai-hearts-settings-v2',defaults=['Michael','Jerry','Barbara'];
const custom=['Aunt May','José & Ana','Bà Ngoại'];
const browser=await webkit.launch();
const read=page=>page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);
const prefs=page=>page.evaluate(PREFS=>JSON.parse(localStorage.getItem(PREFS)),PREFS);
async function open({state=fixtures.pass,language='en',viewport={width:375,height:667},preferences={},failStorage=false}={}){
 const context=await browser.newContext({viewport,serviceWorkers:'block',hasTouch:true});
 const page=await context.newPage();page.on('pageerror',error=>{throw error;});
 await page.addInitScript(({KEY,PREFS,state,language,preferences,failStorage})=>{
  if(!localStorage.getItem(KEY))localStorage.setItem(KEY,JSON.stringify({version:2,game:state,selected:[]}));
  if(!localStorage.getItem(PREFS))localStorage.setItem(PREFS,JSON.stringify({language,pace:'slow',sound:false,tapToPlay:false,...preferences}));
  if(failStorage)Storage.prototype.setItem=()=>{throw new Error('Storage unavailable');};
 },{KEY,PREFS,state,language,preferences,failStorage});
 const now=new Date('2026-09-25T12:00:00Z');await page.clock.install({time:now});await page.clock.pauseAt(now);
 await page.goto(url);return {context,page};
}
async function names(page){await page.locator('#menu-button').click();await page.locator('#names-button').click();}
async function fill(page,values){for(let i=0;i<3;i++)await page.locator(`#opponent-${i+1}`).fill(values[i]);}
async function save(page){await page.locator('#names-form [type="submit"]').click();}
async function checkNames(page,values){
 assert.deepEqual(await page.locator('.seat [data-name-for]').allTextContents(),values);
 for(let i=1;i<=3;i++)assert((await page.locator(`.seat[data-player="${i}"]`).getAttribute('aria-label')).startsWith(values[i-1]+':'));
}
async function fits(page,selector){
 const overflow=await page.locator(selector).evaluate(el=>el.scrollWidth>el.clientWidth+1);
 assert.equal(overflow,false,`${selector} must fit horizontally`);
}
async function pointer(page,selector,type,point,id=1){
 await page.locator(selector).evaluate((el,{type,point,id})=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:id,isPrimary:id===1,clientX:point.x,clientY:point.y})),{type,point,id});
}
try{
 for(const language of ['en','es','vi'])for(const viewport of [{width:390,height:740},{width:375,height:667},{width:844,height:390}]){
  const {context,page}=await open({language,viewport});
  const before=await read(page);
  await names(page);assert(await page.locator('#names-promise').isVisible());assert(await page.locator('#names-editor').isHidden());
  await fits(page,'#names-dialog');await page.screenshot({path:`${artifacts}/names-promise-${language}-${viewport.width}.png`});
  await page.locator('#names-promise [data-close]').click();assert.equal((await prefs(page)).schoolPromise,false);
  await names(page);await page.locator('#promise-button').click();
  assert(await page.locator('#names-editor').isVisible());assert.equal((await prefs(page)).schoolPromise,true);
  assert.equal(await page.locator('#names-thanks').evaluate(el=>document.activeElement===el),true,'Unlock focuses confirmation without raising the keyboard');
  assert.equal(await page.locator('#opponent-1').evaluate(el=>getComputedStyle(el).userSelect),'text');
  await page.locator('#names-dialog').evaluate(el=>{el.scrollTop=0;});
  await page.screenshot({path:`${artifacts}/names-editor-${language}-${viewport.width}.png`});
  await fill(page,custom);await save(page);await checkNames(page,custom);
  assert.deepEqual(await read(page),before,'Naming never changes cards, scores, or selected cards');
  assert((await page.locator('#table-status').textContent()).includes(custom[0]));
  await page.reload();await names(page);assert(await page.locator('#names-promise').isHidden());
  assert.deepEqual(await page.locator('#names-form input').evaluateAll(inputs=>inputs.map(i=>i.value)),custom);
  await fill(page,['Changed','Changed','Changed']);await page.locator('#names-form [data-close]').click();
  await names(page);assert.deepEqual(await page.locator('#names-form input').evaluateAll(inputs=>inputs.map(i=>i.value)),custom,'Cancel discards the draft');
  await page.locator('#reset-names').click();await save(page);await checkNames(page,defaults);assert.equal((await prefs(page)).schoolPromise,true);
  await names(page);await fill(page,['  Helen  ','   ','<b>Mom</b>']);await save(page);await checkNames(page,['Helen','Jerry','<b>Mom</b>']);
  assert.equal(await page.locator('.seat-name b').count(),0,'Names render as text');
  await page.locator('#menu-button').click();await page.locator('#new-game').click();await page.locator('#restart').click();
  assert.equal((await prefs(page)).schoolPromise,true);await checkNames(page,['Helen','Jerry','<b>Mom</b>']);
  await context.close();
 }
 // Every name-bearing game view uses seat identity, including duplicate names.
 for(const state of [fixtures.received,fixtures.play,fixtures.trick,fixtures.liveMoondanger,fixtures.handEnd,fixtures.lose]){
  const values=['Alex','Alex','Bà Ngoại'];
  const {context,page}=await open({state,preferences:{schoolPromise:true,opponentNames:values}});
  await checkNames(page,values);
  const before=await read(page);await names(page);await page.clock.runFor(8000);assert.deepEqual(await read(page),before,'Naming pauses the game');
  await fill(page,custom);await save(page);assert.deepEqual(await read(page),before);
  if(state.phase==='received')assert((await page.locator('#table-status').textContent()).includes(custom[(4-state.passOffset)%4-1]));
  if(state.phase==='play'||state.phase==='trick-end'){
   for(const play of state.trick)if(play.player)assert((await page.locator(`[data-trick-player="${play.player}"] .trick-card`).getAttribute('aria-label')).startsWith(custom[play.player-1]+':'));
   const candidate=I.summarize(state).candidate;
   if(candidate>0)assert((await page.locator('.watch-title').textContent()).includes(custom[candidate-1]));
  }
  if(state.phase==='hand-end'||state.phase==='game-over')for(const name of custom)assert((await page.locator('.result-scores').textContent()).includes(name));
  if(state.phase==='trick-end'||state.history.length){
   await page.locator('#menu-button').click();await page.locator('#last-trick-button').click();
   const captions=await page.locator('.review-play figcaption').allTextContents();for(const name of custom)assert(captions.includes(name));
  }
  await context.close();
 }
 // Long names fit table, scores, and dialogs on a short phone and landscape.
 for(const language of ['en','es','vi'])for(const viewport of [{width:375,height:667},{width:844,height:390}])for(const [label,state] of Object.entries({pass:fixtures.pass,moonWatch:fixtures.liveMoonwatch,moonTurn:fixtures.moonYourTurn,moonDanger:fixtures.liveMoondanger,gameOver:fixtures.lose})){
  const values=['W'.repeat(24),'Nguyễn Thị Thanh Phương','Alexandria Montgomery'];
  const {context,page}=await open({state,viewport,language,preferences:{schoolPromise:true,opponentNames:values}});
  await checkNames(page,values.map(value=>value.slice(0,10).trim()));
  assert((await prefs(page)).opponentNames.every(value=>value.length<=10),'Earlier saved names adopt the ten-character limit');
  await fits(page,'.game');await fits(page,'.score-rail');
  if(state.phase==='game-over')await fits(page,'.result-scores');
  else {
   const action=await page.locator('#primary-action').boundingBox();assert(action.y+action.height<=viewport.height,`${label} ${viewport.width}: primary action stays on screen`);
   const status=await page.locator('#table-status').boundingBox(),watch=await page.locator('#hand-watch').boundingBox();
   if(viewport.width<500)assert(status.y+status.height<=watch.y+1,'Table status must not overlap moon progress');
  }
  if(language==='en')await page.screenshot({path:`${artifacts}/names-long-${label}-${viewport.width}.png`});
  await names(page);await fits(page,'#names-dialog');await context.close();
 }
 for(const preferences of [{opponentNames:custom},{schoolPromise:'true',opponentNames:custom},{schoolPromise:true,opponentNames:[{},null,'  ']}]){
  const {context,page}=await open({preferences});await checkNames(page,defaults);await context.close();
 }
 {
  const state=fixtures.liveMoondanger,name="$& $` $'",values=[name,name,name];
  const {context,page}=await open({state,preferences:{schoolPromise:true,opponentNames:values}});
  assert.equal(await page.locator('.watch-title .message-name').textContent(),name,'Names preserve dollar signs and markup literally');
  assert.equal(await page.locator('.watch-title b').count(),0);await context.close();
 }
 {
  const {context,page}=await open();await names(page);await page.locator('#promise-button').click();
  await page.locator('#opponent-1').fill('');await page.locator('#opponent-1').pressSequentially('AlexandriaLong');
  assert.equal(await page.locator('#opponent-1').inputValue(),'Alexandria','Typing stops at ten characters');
  await page.locator('#opponent-2').fill('ABCDEFGHIJKLM');
  assert.equal(await page.locator('#opponent-2').inputValue(),'ABCDEFGHIJ','Pasted text is capped too');
  await save(page);await page.reload();await checkNames(page,['Alexandria','ABCDEFGHIJ','Barbara']);await context.close();
 }
 {
  const {context,page}=await open({failStorage:true});await names(page);await page.locator('#promise-button').click();
  await fill(page,custom);await save(page);assert(await page.locator('#names-storage-note').isVisible());
  await page.locator('#names-dialog .close-button').click();await checkNames(page,custom);await context.close();
 }
 // Slow release with upward drift unlocks exactly once; inputs remain editable.
 {
  const {context,page}=await open();await names(page);await page.locator('#promise-button').scrollIntoViewIfNeeded();
  let box=await page.locator('#promise-button').boundingBox(),point={x:box.x+25,y:box.y+8};
  await pointer(page,'#promise-button','pointerdown',point);await page.clock.runFor(4000);
  assert.equal((await prefs(page)).schoolPromise,false);
  point.y-=24;await pointer(page,'#promise-button','pointermove',point);await pointer(page,'#promise-button','pointerup',point);
  await page.locator('#promise-button').evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1})));
  assert(await page.locator('#names-editor').isVisible());await fill(page,custom);
  assert.equal(await page.locator('#opponent-1').evaluate(el=>el.dispatchEvent(new Event('selectstart',{bubbles:true,cancelable:true}))),true,'Input selection is not prevented');
  await page.locator('#names-form [type="submit"]').focus();await page.keyboard.press('Enter');await checkNames(page,custom);await context.close();
 }
 for(const interruption of ['drag','cancel','second-finger']){
  const {context,page}=await open();await names(page);await page.locator('#promise-button').scrollIntoViewIfNeeded();
  const box=await page.locator('#promise-button').boundingBox(),point={x:box.x+25,y:box.y+8};
  await pointer(page,'#promise-button','pointerdown',point);
  if(interruption==='drag')await pointer(page,'#promise-button','pointermove',{x:point.x,y:point.y-60});
  if(interruption==='cancel')await pointer(page,'#promise-button','pointercancel',point);
  if(interruption==='second-finger'){await pointer(page,'#promise-button','pointerdown',point,2);await pointer(page,'#promise-button','pointerup',point,2);}
  await pointer(page,'#promise-button','pointerup',point);assert.equal((await prefs(page)).schoolPromise,false);await context.close();
 }
 console.log('PASS: school-promise gate, cancellation, persistence, names across game views, unchanged saves, paused play, defaults, unsafe/malformed text, storage failure, and slow touch in three languages and viewports.');
}finally{await browser.close();}
const chrome=await chromium.launch(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{});
try{
 const context=await chrome.newContext({viewport:{width:375,height:667},hasTouch:true,isMobile:true}),page=await context.newPage();
 await page.goto(url);await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
 const cdp=await context.newCDPSession(page);
 async function slowTouch(selector){
  await page.locator(selector).scrollIntoViewIfNeeded();const box=await page.locator(selector).boundingBox(),x=box.x+20,y=box.y+8;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await page.waitForTimeout(1200);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-24}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }
 await names(page);await slowTouch('#promise-button');assert(await page.locator('#names-editor').isVisible());
 await fill(page,custom);await slowTouch('#names-form [type="submit"]');assert.equal(await page.locator('#names-dialog').evaluate(el=>el.open),false);
 await context.setOffline(true);await page.reload();await checkNames(page,custom);await names(page);
 assert(await page.locator('#names-promise').isHidden());await fill(page,['Mom','Dad','Grandma']);await save(page);
 await page.reload();await checkNames(page,['Mom','Dad','Grandma']);
 console.log('PASS: Chrome native slow presses and upward drift unlock/save once; promise and names survive offline reload and remain editable offline.');
}finally{await chrome.close();}
