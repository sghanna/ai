import assert from 'node:assert/strict';
import {webkit,E,KEY,url,createFixtures} from './support.mjs';

const fixtures = createFixtures();
const portrait = {width:768,height:900}, landscape = {width:1024,height:768};
const browser = await webkit.launch();
const errors = [];
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)),KEY);
const rows = page => page.locator('#hand .hand-row').evaluateAll(nodes => nodes.map(node => node.querySelectorAll('.card').length));
const columns = page => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--hand-columns').trim());

async function open(state,{selected=[],reducedMotion='no-preference'}={}) {
  const context = await browser.newContext({viewport:portrait,serviceWorkers:'block',reducedMotion});
  const page = await context.newPage();
  page.on('pageerror',error => errors.push(error));
  await page.addInitScript(({key,state,selected}) => {
    localStorage.setItem(key,JSON.stringify({version:2,game:state,selected}));
  },{key:KEY,state,selected});
  await page.clock.install();
  await page.goto(url);
  return {page,context};
}

async function rotate(page,viewport) {
  await page.setViewportSize(viewport);
  await page.waitForFunction(expected => {
    if (getComputedStyle(document.documentElement).getPropertyValue('--hand-columns').trim() !== expected) return false;
    const hand=document.querySelector('#hand');
    const count=hand.querySelectorAll('.card').length;
    const actual=[...hand.querySelectorAll('.hand-row')].map(row => row.querySelectorAll('.card').length);
    const wanted=expected === '7' ? count > 7 ? [Math.ceil(count/2),Math.floor(count/2)] : count ? [count] : []
      : [Math.min(5,count),Math.min(4,Math.max(0,count-5)),Math.max(0,count-9)].filter(Boolean);
    return actual.join(',') === wanted.join(',');
  },viewport.width === 768 ? '7' : '5');
}

let opening;
for (let seed=1; seed<100 && !opening; seed++) {
  let value=seed;
  const random=() => { value=(Math.imul(value,1664525)+1013904223)>>>0; return value/4294967296; };
  const deal=E.newGame(random);
  const received=E.pass(deal,deal.hands.map((_,player) => E.choosePass(E.viewFor(deal,player))));
  const play=E.begin(received);
  if (play.turn === 0 && E.legalCards(play,0).length === 1) opening=play;
}
assert(opening);

try {
  {
    const {page,context}=await open(fixtures.pass);
    assert.equal(await columns(page),'7');
    assert.deepEqual(await rows(page),[7,6]);
    const choices=fixtures.pass.hands[0].slice(0,3);
    for (const card of choices) await page.locator(`#hand [data-card="${card}"]`).click({position:{x:12,y:12}});
    assert.deepEqual((await saved(page)).selected,choices);
    const focused=choices.at(-1);
    await page.locator(`#hand [data-card="${focused}"]`).focus();
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.card),focused);
    await rotate(page,landscape);
    assert.deepEqual(await rows(page),[5,4,4]);
    assert.deepEqual((await saved(page)).selected,choices);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.card),focused);
    await page.locator('#menu-button').click();
    await page.locator('#settings-button').focus();
    await rotate(page,portrait);
    assert.deepEqual(await rows(page),[7,6]);
    assert.equal(await page.evaluate(() => document.activeElement?.id),'settings-button','Dialog focus survives regrouping');
    assert.deepEqual((await saved(page)).selected,choices);
    await page.locator('#menu-dialog .dialog-action').click();
    assert.deepEqual((await saved(page)).game,fixtures.pass);
    await context.close();
  }
  {
    const state=fixtures.allPlayable;
    assert(E.legalCards(state,0).length>1);
    const {page,context}=await open(state);
    const choice=E.legalCards(state,0)[0];
    await page.locator(`#hand [data-card="${choice}"]`).click({position:{x:12,y:12}});
    await page.locator(`#hand [data-card="${choice}"]`).focus();
    await rotate(page,landscape);
    await rotate(page,portrait);
    assert.deepEqual((await saved(page)).game,state,'Rotation must not play a selected card');
    assert.deepEqual((await saved(page)).selected,[choice]);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.card),choice);
    const selector=`#hand [data-card="${choice}"]`;
    const box=await page.locator(selector).boundingBox();
    await page.locator(selector).evaluate((button,point) => button.dispatchEvent(new PointerEvent('pointerdown',{
      bubbles:true,cancelable:true,pointerType:'touch',pointerId:1,isPrimary:true,
      clientX:point.x,clientY:point.y,buttons:1
    })),{x:box.x+12,y:box.y+12});
    await rotate(page,landscape);
    // The held button was replaced. A late native compatibility click must not
    // deselect the corresponding new button if pointerup went to the old node.
    await page.locator(selector).evaluate(button => button.dispatchEvent(new MouseEvent('click',{
      bubbles:true,cancelable:true,detail:1
    })));
    assert.deepEqual((await saved(page)).selected,[choice],'Rotation cancels a held card and its late click');
    await page.locator('#primary-action').click();
    assert.deepEqual((await saved(page)).game,E.play(state,0,choice),'A fresh mouse click works after the lost touch release');
    await context.close();
  }
  {
    const state=fixtures.receivedTop;
    const {page,context}=await open(state);
    assert.equal(await page.locator('.table').getAttribute('data-receipt'),'waiting');
    assert.equal(await page.locator('.receipt-pending').count(),3);
    await rotate(page,landscape);
    assert.equal(await page.locator('.table').getAttribute('data-receipt'),'waiting');
    assert.equal(await page.locator('.receipt-pending').count(),3);
    await page.clock.runFor(650);
    assert.equal(await page.locator('.receipt-flight-card').count(),3,'Flight must target regrouped cards');
    await rotate(page,portrait);
    assert.equal(await page.locator('.table').getAttribute('data-receipt'),'done');
    assert.equal(await page.locator('.receipt-pending, .receipt-flight').count(),0);
    assert.deepEqual((await saved(page)).game,state);
    await page.clock.runFor(5000);
    assert.deepEqual((await saved(page)).game,state,'Receipt still waits for Start playing');
    await context.close();
  }
  {
    const state=fixtures.receivedTop;
    const {page,context}=await open(state);
    await page.locator('#menu-button').click();
    await rotate(page,landscape);
    await page.clock.runFor(5000);
    assert.equal(await page.locator('.receipt-flight').count(),0);
    await page.locator('#menu-dialog .dialog-action').click();
    await page.clock.runFor(650);
    assert.equal(await page.locator('.receipt-flight-card').count(),3);
    await page.evaluate(() => document.querySelector('.receipt-flight').getAnimations({subtree:true}).forEach(animation => animation.finish()));
    await page.waitForFunction(() => document.querySelector('.table').dataset.receipt === 'done');
    assert.deepEqual((await saved(page)).game,state);
    await context.close();
  }
  {
    const state=fixtures.trick,expected=E.collect(state);
    const {page,context}=await open(state);
    assert.equal(await page.locator('.table').getAttribute('data-collection'),'waiting');
    await rotate(page,landscape);
    assert.deepEqual((await saved(page)).game,state);
    await page.clock.runFor(1200);
    assert.equal(await page.locator('.trick-flight-card').count(),4,'Collection starts from the resized table');
    await rotate(page,portrait);
    assert.deepEqual((await saved(page)).game,expected,'Rotation completes collection once');
    await page.locator('#menu-button').click();
    await page.clock.runFor(5000);
    assert.deepEqual((await saved(page)).game,expected);
    await context.close();
  }
  {
    const state=fixtures.trick,expected=E.collect(state);
    const {page,context}=await open(state);
    await page.locator('#menu-button').click();
    await rotate(page,landscape);
    await page.clock.runFor(5000);
    assert.deepEqual((await saved(page)).game,state,'Menu pauses collection while waiting');
    await page.locator('#menu-dialog .dialog-action').click();
    await page.clock.runFor(1200);
    assert.equal(await page.locator('.trick-flight-card').count(),4);
    await rotate(page,portrait);
    assert.deepEqual((await saved(page)).game,expected);
    await context.close();
  }
  {
    const card=E.legalCards(opening,0)[0],expected=E.play(opening,0,card);
    const {page,context}=await open(opening);
    assert.deepEqual((await saved(page)).selected,[card]);
    await page.clock.runFor(1200);
    await rotate(page,landscape);
    assert.deepEqual((await saved(page)).game,opening);
    assert.deepEqual((await saved(page)).selected,[card]);
    await page.locator('#menu-button').click();
    await page.clock.runFor(5000);
    await rotate(page,portrait);
    assert.deepEqual((await saved(page)).game,opening,'Dialog pauses countdown through rotation');
    await page.locator('#menu-dialog .dialog-action').click();
    await page.clock.runFor(1500);
    assert.deepEqual((await saved(page)).game,opening);
    await page.clock.runFor(500);
    assert.deepEqual((await saved(page)).game,expected);
    await page.locator('#menu-button').click();
    await page.clock.runFor(2000);
    assert.deepEqual((await saved(page)).game,expected,'No second automatic play');
    await context.close();
  }
  {
    const {page,context}=await open(fixtures.receivedTop,{reducedMotion:'reduce'});
    assert.equal(await page.locator('.table').getAttribute('data-receipt'),'done');
    assert.equal(await page.locator('.receipt-flight, .receipt-pending').count(),0);
    await rotate(page,landscape);
    assert.deepEqual((await saved(page)).game,fixtures.receivedTop);
    await context.close();
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: tablet hand regrouping and focus, selected pass/play, receipt waiting/moving/Menu/Reduced Motion, collection waiting/moving/Menu, and countdown through rotation.');
} finally { await browser.close(); }
