import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {webkit,chromium,E,KEY,url,artifacts,createFixtures} from './support.mjs';

const fixtures=createFixtures();
const PREFS='ai-hearts-settings-v2';
const report={suite:'iPad responsive browser verification',url,engine:'desktop Playwright WebKit; Chrome for service-worker offline test',physicalDevice:false,started:new Date().toISOString(),cases:[],failures:[],screenshots:[]};
const dimensions=[
  [768,1024],[768,960],[768,900],[768,860],
  [1024,768],[1024,700],[1024,640],[1024,600],
  [600,900],[507,900],[820,1180]
];
const states=['pass','received','allPlayable','trick','liveMoondanger','handEnd','moon'];
const longNames=['Alexandria','Christophe','ValentinaX'];
const read=page=>page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);
function check(condition,message,context){if(!condition)report.failures.push({...context,message});}
function near(a,b,tolerance=1){return Math.abs(a-b)<=tolerance;}
async function picture(page,name){const path=`${artifacts}/ipad-${name}.png`;await page.screenshot({path,fullPage:false});report.screenshots.push(path);}
async function open(browser,{width,height,language='en',state=fixtures.pass,serviceWorkers='block',reducedMotion='reduce',clock=false,prefs={}}){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers,reducedMotion});
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(({KEY,PREFS,state,language,prefs})=>{
    if(!localStorage.getItem(KEY))localStorage.setItem(KEY,JSON.stringify({version:2,game:state,selected:[]}));
    if(!localStorage.getItem(PREFS))localStorage.setItem(PREFS,JSON.stringify({language,pace:'slow',sound:false,tapToPlay:false,schoolPromise:true,opponentNames:['Alexandria','Christophe','ValentinaX'],...prefs}));
  },{KEY,PREFS,state,language,prefs});
  if(clock){const now=new Date('2026-09-25T12:00:00Z');await page.clock.install({time:now});await page.clock.pauseAt(now);}
  await page.goto(url);await page.evaluate(()=>document.fonts.ready);
  return {page,context,errors};
}
async function metrics(page){return page.evaluate(()=>{
  const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
  const action=document.querySelector(document.getElementById('result-screen').hidden?'#primary-action':'.result-continue');
  const cards=[...document.querySelectorAll('#hand .card')];
  const played=[...document.querySelectorAll('.trick-card')];
  const receipt=[...document.querySelectorAll('.pass-slot.filled')];
  const seats=[...document.querySelectorAll('.seat')];
  const point=(x,y)=>document.elementFromPoint(x,y);
  const hit=e=>{const r=e.getBoundingClientRect();return point(r.x+r.width/2,r.y+r.height/2)?.closest('#primary-action,.result-continue')===e;};
  const cardHits=cards.map(card=>{
    const r=card.getBoundingClientRect();
    const hitAt=(fx,dy)=>{const x=r.x+r.width*fx,y=r.y+dy;return {x:Math.round(x),y:Math.round(y),hit:point(x,y)?.closest('#hand .card')===card};};
    return {code:card.dataset.card,rank:hitAt(.23,Math.min(13,r.height*.12)),suit:hitAt(.82,Math.min(24,r.height*.18)),box:box(card)};
  });
  const result=document.getElementById('result-screen');
  const dialog=[...document.querySelectorAll('dialog')].find(el=>el.open);
  return {
    viewport:[innerWidth,innerHeight],pageScroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
    game:box(document.querySelector('.game')),action:action?box(action):null,actionHit:action?hit(action):false,
    cardWidth:cards[0]?.getBoundingClientRect().width??null,cardHeight:cards[0]?.getBoundingClientRect().height??null,
    cardHits,rows:[...document.querySelectorAll('#hand .hand-row')].map(row=>row.querySelectorAll('.card').length),
    columns:getComputedStyle(document.documentElement).getPropertyValue('--hand-columns').trim(),
    playedWidths:played.map(e=>e.getBoundingClientRect().width),receiptWidths:receipt.map(e=>e.getBoundingClientRect().width),
    scoreFit:seats.every(e=>e.scrollWidth<=e.clientWidth+1),
    scoreVisible:seats.every(e=>{const r=e.getBoundingClientRect();return r.width>=75&&r.y>=0&&r.bottom<=innerHeight&&[...e.querySelectorAll('.seat-hand,.seat-total')].every(child=>{const b=child.getBoundingClientRect();return b.width>0&&b.bottom<=r.bottom+1;});}),
    seatNameSizes:seats.map(e=>getComputedStyle(e.querySelector('.seat-name')).fontSize),
    watch:result.hidden?{box:box(document.querySelector('#hand-watch')),text:document.querySelector('#hand-watch').innerText}:null,
    resultScroll:result.hidden?null:{client:result.clientHeight,scroll:result.scrollHeight,horizontal:result.scrollWidth>result.clientWidth+1},
    dialog:dialog?{box:box(dialog),client:dialog.clientHeight,scroll:dialog.scrollHeight}:null,
    text:document.body.innerText.slice(0,900)
  };
});}
function validate(m,{width,height,language,state}){
  const at={width,height,language,state};
  check(m.viewport[0]===width&&m.viewport[1]===height,'Viewport changed unexpectedly',at);
  check(m.pageScroll[0]<=width+1,'Horizontal page overflow',at);
  check(m.pageScroll[1]<=height+1,'Gameplay page scrolls',at);
  if(!m.resultScroll)check(m.scoreFit&&m.scoreVisible,'Scores or totals are clipped',at);
  check(!!m.action&&m.action.y>=0&&m.action.bottom<=height+1&&m.action.width>100,'Primary action is clipped',at);
  check(m.actionHit,'Primary action center fails hit testing',at);
  if(m.cardWidth){
    check(m.cardHits.every(c=>c.box.x>=-1&&c.box.right<=width+1&&c.box.bottom<=m.action.y+1),'Hand card clipped or overlaps action',at);
    check(m.cardHits.every(c=>c.rank.hit),`Rank corner fails hit testing: ${m.cardHits.filter(c=>!c.rank.hit).map(c=>c.code).join(', ')}`,at);
    check(m.cardHits.every(c=>c.suit.hit),`Suit corner fails hit testing: ${m.cardHits.filter(c=>!c.suit.hit).map(c=>c.code).join(', ')}`,at);
    check(m.playedWidths.every(w=>near(w,m.cardWidth,1)),'Played card and hand card widths differ',at);
    check(m.receiptWidths.every(w=>near(w,m.cardWidth,2)),'Received card and hand card widths differ',at);
    if(width===768&&height===1024)check(m.cardWidth>=88&&m.cardWidth<=100,'Portrait card width misses 90–96 px design target',at);
    if(width===768&&height>=860&&['pass','received'].includes(state))check(m.rows.length===2&&m.rows[0]===7,'Portrait full hand should use two 7/6 rows',at);
    if(width===768&&height>=860&&state==='allPlayable')check(m.rows.length===2&&Math.abs(m.rows[0]-m.rows[1])<=1,'Portrait reduced hand should use two balanced rows',at);
    if(width===1024&&height<=768&&['pass','received'].includes(state))check(m.rows.length===3&&m.rows[0]===5,'Landscape full hand should use 5/4/4 rows',at);
    if(width===768&&height>=860)check(m.columns==='7','Portrait CSS hand-column contract is missing',at);
    if(width===1024&&height<=768)check(m.columns==='5','Landscape CSS hand-column contract is missing',at);
  }
  if(m.watch){
    const w=m.watch.box,a=m.action;
    const overlaps=w.x<a.right-1&&w.right>a.x+1&&w.y<a.bottom-1&&w.bottom>a.y+1;
    check(w.width>100&&w.y>=0&&w.bottom<=height+1&&!overlaps,'Moon progress panel is hidden or overlaps action',at);
  }
  if(state==='liveMoondanger')check(/\d+\s*\/\s*13/.test(m.watch?.text||''),'Moon heart count missing',at);
  if(state==='handEnd'||state==='moon')check(m.resultScroll?.client>0,'Result screen hidden',at);
  if(m.resultScroll)check(!m.resultScroll.horizontal,'Result screen has horizontal overflow',at);
}
async function matrix(browser){
  for(const language of ['en','es','vi'])for(const [width,height] of dimensions){
    for(const state of states){
      const {page,context,errors}=await open(browser,{width,height,language,state:fixtures[state],clock:true});
      try{
        const m=await metrics(page);validate(m,{width,height,language,state});
        check(errors.length===0,`Page errors: ${errors.join('; ')}`,{width,height,language,state});
        if(language==='en'&&[[768,1024],[1024,640],[600,900],[820,1180]].some(([w,h])=>w===width&&h===height)&&['pass','received','allPlayable','trick','liveMoondanger','handEnd'].includes(state))await picture(page,`${state}-${language}-${width}x${height}`);
        if(width===768&&height===1024&&language!=='en'&&['pass','allPlayable','handEnd'].includes(state))await picture(page,`${state}-${language}-${width}x${height}`);
        report.cases.push({kind:'render',width,height,language,state,metrics:m});
        if(state==='pass'&&((width===768&&height===900)||(width===1024&&height===640)))await dialogs(page,language,width,height);
      }finally{await context.close();}
    }
  }
}
async function dialogs(page,language,width,height){
  const saved=await read(page);
  await page.locator('#menu-button').click();
  let m=await metrics(page);
  check(!!m.dialog&&m.dialog.box.y>=0&&m.dialog.box.bottom<=height+1,'Menu escapes viewport',{language,width,height,dialog:'menu'});
  check(await page.locator('#how-to-play-button').isVisible(),'How to play missing from Menu',{language,width,height});
  if(language==='en')await picture(page,`menu-${width}x${height}`);
  await page.locator('#how-to-play-button').click();m=await metrics(page);
  check(!!m.dialog&&m.dialog.box.bottom<=height+1&&m.dialog.scroll>=m.dialog.client,'Help dialog cannot scroll within viewport',{language,width,height});
  await page.locator('#help-dialog .dialog-action[data-close]').click();
  await page.locator('#menu-button').click();await page.locator('#names-button').click();
  check(await page.locator('#names-editor').isVisible(),'Saved promise did not reveal name editor',{language,width,height});
  if(width===768){
    await page.locator('#opponent-1').focus();
    await page.setViewportSize({width,height:600});
    await page.locator('#opponent-3').fill('ValentinaX');
    await page.locator('#names-form [type="submit"]').scrollIntoViewIfNeeded();
    m=await metrics(page);
    check(!!m.dialog&&m.dialog.box.bottom<=601&&m.dialog.box.y>=0,'Shortened name editor escapes viewport',{language,width,height:600});
    const action=page.locator('#names-form [type="submit"]');
    check(await action.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el;}),'Shortened name editor save action is blocked',{language,width,height:600});
    if(language==='en')await picture(page,'names-edit-short-768x600');
    await page.setViewportSize({width,height});
  }
  await page.locator('#names-dialog [data-close]').last().click();
  check(JSON.stringify(await read(page))===JSON.stringify(saved),'Dialogs changed saved game',{language,width,height});
  report.cases.push({kind:'dialogs',width,height,language,shortNameEdit:width===768});
}
async function clickableCard(page,code){
  const position=await page.locator(`#hand [data-card="${code}"]`).evaluate(el=>{
    const r=el.getBoundingClientRect();
    for(const dy of [12,20,28,36,45])for(const fx of [.22,.5,.78]){
      const x=r.x+r.width*fx,y=r.y+dy;
      if(y<r.bottom&&document.elementFromPoint(x,y)?.closest('#hand .card')===el)return {x:r.width*fx,y:dy};
    }
    return null;
  });
  assert(position,`No exposed hit target for ${code}`);
  await page.locator(`#hand [data-card="${code}"]`).click({position});
}
async function fullHand(browser){
  const {page,context,errors}=await open(browser,{width:768,height:960,clock:false,reducedMotion:'reduce',prefs:{opponentNames:longNames}});
  const mark={kind:'full-hand',viewport:[768,960],moves:0,passes:0};
  try{
    let save=await read(page);assert(E.validate(save.game));
    const pass=E.choosePass(E.viewFor(save.game,0));
    for(const card of pass)await clickableCard(page,card);
    assert.equal(await page.locator('#hand [aria-pressed="true"]').count(),3);
    await picture(page,'full-hand-pass-selected-768x960');
    await page.locator('#primary-action').click();mark.passes++;
    assert.equal((await read(page)).game.phase,'received');
    await page.reload();assert.equal((await read(page)).game.phase,'received');
    assert.equal(await page.locator('#hand .received').count(),3);
    await picture(page,'full-hand-received-768x960');
    await page.locator('#primary-action').click();
    let sawTrick=false;
    while(true){
      save=await read(page);const s=save.game;assert(E.validate(s));
      if(s.phase==='hand-end'||s.phase==='game-over')break;
      assert(++mark.moves<110,'Full hand stalled');
      if(s.phase==='play'&&s.turn===0){
        const card=E.choosePlay(E.viewFor(s,0));
        if(await page.locator(`#hand [data-card="${card}"]`).getAttribute('aria-pressed')!=='true')await clickableCard(page,card);
        await page.locator('#primary-action').click();
      }else if(s.phase==='trick-end'){
        if(!sawTrick){await picture(page,'full-hand-trick-768x960');sawTrick=true;}
        await page.waitForFunction(({KEY,count})=>JSON.parse(localStorage.getItem(KEY)).game.history.length===count+1,{KEY,count:s.history.length},{timeout:9000});
      }else await page.waitForFunction(({KEY,phase,turn})=>{const s=JSON.parse(localStorage.getItem(KEY)).game;return s.phase!==phase||s.turn!==turn;},{KEY,phase:s.phase,turn:s.turn},{timeout:9000});
    }
    save=await read(page);assert.equal(save.game.history.length,13);assert.equal(save.game.handPoints.reduce((a,b)=>a+b),26);
    await picture(page,'full-hand-results-768x960');
    const previous=save.game.scores;
    await page.locator('.result-continue').click();
    save=await read(page);assert.equal(save.game.handNumber,2);assert.deepEqual(save.game.scores,previous);assert(E.validate(save.game));
    await page.reload();assert.equal((await read(page)).game.handNumber,2);
    assert.deepEqual(errors,[]);mark.result='pass';report.cases.push(mark);
  }finally{await context.close();}
}
async function offline(){
  const worker=await fs.readFile(new URL('../service-worker.js',import.meta.url),'utf8');
  const cacheName=worker.match(/const CACHE = '([^']+)'/)?.[1];
  const list=worker.match(/const FILES = \[([^\]]+)\]/)?.[1];
  assert(cacheName&&list,'Service worker cache declaration not found');
  const files=[...list.matchAll(/'([^']+)'/g)].map(match=>match[1]);
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});
  const context=await browser.newContext({viewport:{width:768,height:1024},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page=await context.newPage();const mark={kind:'offline',viewport:[768,1024]};
  try{
    await page.goto(url);await page.evaluate(()=>navigator.serviceWorker.ready);
    await page.reload();assert(await page.evaluate(()=>Boolean(navigator.serviceWorker.controller)),'Service worker did not control the page');
    const cacheCheck=await page.evaluate(async ({cacheName,files})=>{
      const names=await caches.keys(),cache=await caches.open(cacheName),missing=[];
      for(const file of files){const response=await cache.match(new URL(file,location.href));if(!response?.ok)missing.push(file);}
      return {names,missing};
    },{cacheName,files});
    assert(cacheCheck.names.includes(cacheName),`Expected ${cacheName} cache is missing`);
    assert.deepEqual(cacheCheck.missing,[],'Precached asset missing');
    mark.cacheName=cacheName;mark.cachedAssets=files.length;
    const before=await read(page);assert(E.validate(before.game));
    await context.setOffline(true);await page.reload();
    const offlineAssets=await page.evaluate(async files=>Promise.all(files.map(async file=>({file,status:(await fetch(file)).status}))),files);
    assert(offlineAssets.every(asset=>asset.status===200),'An offline asset fetch failed');
    assert.deepEqual((await read(page)).game,before.game,'Offline reload lost the game');
    const pass=E.choosePass(E.viewFor(before.game,0));for(const card of pass)await clickableCard(page,card);
    await page.locator('#primary-action').click();assert.equal((await read(page)).game.phase,'received');
    await page.reload();assert.equal((await read(page)).game.phase,'received');
    mark.result='pass';report.cases.push(mark);
  }finally{await context.close();await browser.close();}
}
const scope=process.env.IPAD_SCOPE||'all';
if(scope==='all'){
  const browser=await webkit.launch();
  try{await matrix(browser);await fullHand(browser);}
  catch(error){report.failures.push({kind:'fatal',message:error.stack||String(error)});}
  finally{await browser.close();}
}
try{await offline();}catch(error){report.failures.push({kind:'offline',message:error.stack||String(error)});}
report.finished=new Date().toISOString();report.caseCount=report.cases.length;report.failureCount=report.failures.length;
const reportFile=`${artifacts}/ipad-${scope==='all'?'report':'offline-report'}.json`;
await fs.writeFile(reportFile,JSON.stringify(report,null,2));
if(report.failures.length){console.error(`FAIL: ${report.failures.length} iPad checks. See ${reportFile}`);for(const failure of report.failures.slice(0,20))console.error(failure);process.exitCode=1;}
else console.log(`PASS: ${report.caseCount} tablet render/dialog/play/offline checks. Evidence: ${reportFile}`);
