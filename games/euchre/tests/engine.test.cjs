const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js');
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const bid=(s,suit=null,alone=false)=>E.step(s,{type:'bid',suit,alone});
test('24-card deal, clockwise packets and dealer rotation',()=>{
 const deck=E.shuffled(rng(1)),s=E.start({deck,dealer:3});
 assert.deepEqual(s.hands[0],deck.slice(0,3).concat(deck.slice(12,14)));
 assert.equal(s.hands.flat().length,20);assert.equal(s.kitty.length,4);assert.equal(s.turn,0);
 let r=E.start({deck,stickDealer:false});for(let i=0;i<8;i++)r=bid(r);
 assert.equal(r.phase,'redeal');r=E.step(r,{type:'nextHand',deck});assert.equal(r.dealer,0);assert.equal(r.turn,1);
});
test('bowers change effective suit for every trump, including following the printed suit',()=>{
 for(const trump of E.SUITS){
  const right='J'+trump,left='J'+E.PAIR[trump],other=E.PAIR[trump];
  assert.equal(E.effectiveSuit(left,trump),trump);
  assert.deepEqual(E.legalCards([left,'A'+other],[{player:1,card:'9'+trump}],trump),[left]);
  assert.deepEqual(E.legalCards([left,'A'+other],[{player:1,card:'9'+other}],trump),['A'+other]);
  assert.deepEqual(E.legalCards([left,'9'+trump,'A'+other],[{player:1,card:right}],trump),[left,'9'+trump]);
  assert.equal(E.winningPlay([{player:0,card:'A'+trump},{player:1,card:left},{player:2,card:right}],trump).player,2);
 }
});
test('off-suit aces cannot win; trump beats a led ace',()=>{
 assert.equal(E.winningPlay([{player:0,card:'9H'},{player:1,card:'AS'}],'C').player,0);
 assert.equal(E.winningPlay([{player:0,card:'AH'},{player:1,card:'9C'}],'C').player,1);
});
test('two bidding rounds, no turned-down suit, stick dealer and legal pickup discard',()=>{
 let s=E.start({deck:E.shuffled(rng(2))});const suit=E.card(s.upcard).suit;
 assert.throws(()=>bid(s,E.PAIR[suit]));
 for(let i=0;i<4;i++)s=bid(s);assert.equal(s.round,2);assert.equal(s.turn,0);
 assert.throws(()=>bid(s,suit));for(let i=0;i<3;i++)s=bid(s);
 assert.throws(()=>bid(s));s=bid(s,E.PAIR[suit]);assert.equal(s.phase,'play');assert.equal(s.turn,0);
 let t=E.start({deck:E.shuffled(rng(3))});t=bid(t,E.card(t.upcard).suit);
 assert.equal(t.phase,'discard');assert.equal(t.hands[3].length,6);assert.equal(t.kitty.length,3);
 assert.throws(()=>E.step(t,{type:'discard',card:t.hands[0][0]}));
 t=E.step(t,{type:'discard',card:t.upcard});assert.equal(t.hands[3].length,5);assert.equal(t.kitty.length,4);
});
test('lone hand skips partner even when the sitting player is dealer or first leader',()=>{
 for(let maker=0;maker<4;maker++){
  let s=E.start({deck:E.shuffled(rng(7)),dealer:3});for(let i=0;i<maker;i++)s=bid(s);
  s=bid(s,E.card(s.upcard).suit,true);assert.equal(s.sittingOut,(maker+2)%4);
  s=E.step(s,{type:'discard',card:s.hands[3][0]});
  const leader=s.sittingOut===0?1:0;assert.equal(s.turn,leader);
  for(let trick=0;trick<5;trick++){
   for(let play=0;play<3;play++){assert.notEqual(s.turn,s.sittingOut);s=E.step(s,E.chooseAction(E.viewFor(s,s.turn)));}
   assert.equal(s.phase,'trick');assert.equal(s.trick.length,3);s=E.step(s,{type:'collect'});
  }
  assert.equal(s.hands[s.sittingOut].length,5);assert.equal(s.tricks.reduce((a,b)=>a+b),5);assert.equal(s.phase,'handOver');
 }
});
test('scoring: made, march, lone march, euchred lone and ordinary teams',()=>{
 for(const maker of [0,1,2,3])for(const alone of [false,true])for(let n=0;n<=5;n++){
  const t=maker%2,tricks=t===0?[n,5-n]:[5-n,n],r=E.points(maker,tricks,alone);
  assert.equal(r.team,n<3?1-t:t);assert.equal(r.points,n<3?2:n===5?(alone?4:2):1);
 }
});
test('bots receive no other hands or kitty and do not mutate their view',()=>{
 let s=E.start({deck:E.shuffled(rng(8))});let v=E.viewFor(s,0);const before=JSON.stringify(v);
 assert.equal('hands' in v,false);assert.equal('kitty' in v,false);assert.equal('deck' in v,false);
 E.chooseAction(v);assert.equal(JSON.stringify(v),before);
});
test('300 complete deterministic matches preserve cards, legal play, scores and replay',()=>{
 for(let seed=1;seed<=300;seed++){
  const random=rng(seed),initial={deck:E.shuffled(random),dealer:seed%4,stickDealer:seed%2===0};
  let s=E.start(initial);const actions=[];let turns=0;
  while(s.phase!=='matchOver'){
   assert.ok(++turns<3000,'Match must finish');
   const all=[...s.hands.flat(),...s.kitty,...s.trick.map(p=>p.card),...s.completed.flatMap(t=>t.plays.map(p=>p.card))];
   assert.equal(all.length,24);assert.equal(new Set(all).size,24);
   const action=s.phase==='trick'?{type:'collect'}:['handOver','redeal'].includes(s.phase)?{type:'nextHand',deck:E.shuffled(random)}:E.chooseAction(E.viewFor(s,s.turn));
   if(action.type==='play')assert.ok(E.legalCards(s.hands[s.turn],s.trick,s.trump).includes(action.card));
   actions.push(action);s=E.step(s,action);
  }
  assert.ok(s.score.some(n=>n>=10));assert.ok(s.score.every(n=>n<=13));
  if(seed<=10)assert.deepEqual(E.restore({version:1,initial,actions}),s);
 }
});
test('saved event replay rejects damaged, incomplete and illegal saves',()=>{
 assert.throws(()=>E.restore(null));assert.throws(()=>E.restore({version:1,initial:{},actions:[]}));
 const initial={deck:E.shuffled(rng(1)),dealer:3,stickDealer:true};
 assert.throws(()=>E.restore({version:1,initial,actions:[{type:'collect'}]}));
 assert.deepEqual(E.restore({version:1,initial,actions:[]}),E.start(initial));
});
