const test=require('node:test'),assert=require('node:assert/strict'),E=require('../engine.js');
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
test('52 unique cards, 13 each, clockwise deal, ordinary jack and ace ranks',()=>{
 const deck=E.shuffled(rng(1)),s=E.start({deck});assert.equal(s.hands.flat().length,52);assert.ok(s.hands.every(h=>h.length===13));assert.equal(s.hands[0][0],deck[0]);assert.equal(s.hands[3][0],deck[3]);assert.equal(s.turn,0);assert.ok(E.strength('AS')>E.strength('JS'));assert.ok(E.strength('QD')>E.strength('JD'));
});
test('one bid per player; Nil is zero; all 0..13 allowed; illegal bids rejected',()=>{
 let s=E.start({deck:E.shuffled(rng(2)),dealer:1});for(const bad of [-1,14,null,2.5,'3'])assert.throws(()=>E.step(s,{type:'bid',bid:bad}));
 for(const bid of [0,13,1,5])s=E.step(s,{type:'bid',bid});assert.equal(s.phase,'play');assert.equal(s.turn,2);assert.deepEqual(s.bids,[1,5,0,13]);assert.throws(()=>E.step(s,{type:'bid',bid:2}));
});
test('spades stay locked on lead until broken, except an all-spade hand',()=>{
 assert.deepEqual(E.legalCards(['AS','2H','JD'],[],false),['2H','JD']);assert.deepEqual(E.legalCards(['AS','2S'],[],false),['AS','2S']);assert.deepEqual(E.legalCards(['AS','2H'],[],true),['AS','2H']);
});
test('must follow suit, may trump first trick if void, low trump beats off-suit ace',()=>{
 assert.deepEqual(E.legalCards(['AS','2H'],[{player:1,card:'AH'}],false),['2H']);assert.deepEqual(E.legalCards(['AS','2D'],[{player:1,card:'AH'}],false),['AS','2D']);
 assert.equal(E.winningPlay([{player:0,card:'AH'},{player:1,card:'2S'},{player:2,card:'AD'},{player:3,card:'KH'}]).player,1);
 assert.equal(E.winningPlay([{player:0,card:'2H'},{player:1,card:'AS'},{player:2,card:'KS'},{player:3,card:'JS'}]).player,1);
});
test('made and set partnership contracts, bags and penalty carry-over',()=>{
 let r=E.teamScore([3,3,2,2],[4,3,3,3],0,0);assert.equal(r.total,52);assert.equal(r.bags,2);assert.equal(r.taken,7);
 r=E.teamScore([3,3,2,2],[2,4,2,5],4,0);assert.equal(r.total,-50);assert.equal(r.bags,4);
 r=E.teamScore([2,3,2,2],[4,3,4,2],8,0);assert.equal(r.total,-56);assert.equal(r.bags,2);assert.equal(r.bagPenalty,100);
});
test('nil +/-100 independent of partner contract, failed nil cannot satisfy it',()=>{
 let r=E.teamScore([0,3,4,3],[0,4,4,5],0,0);assert.equal(r.total,140);assert.equal(r.nils[0].success,true);
 r=E.teamScore([0,3,4,3],[0,5,3,5],0,0);assert.equal(r.total,60);
 r=E.teamScore([0,3,4,3],[2,4,3,4],0,0);assert.equal(r.total,-138);assert.equal(r.taken,3);assert.equal(r.bags,2);assert.equal(r.made,false);
 r=E.teamScore([0,3,4,3],[2,3,5,3],9,0);assert.equal(r.total,-157);assert.equal(r.bags,2);assert.equal(r.bagPenalty,100);
});
test('both partners nil score independently and a 20-bag crossing costs 200',()=>{
 let r=E.teamScore([0,3,0,3],[0,6,0,7],0,0);assert.equal(r.total,200);
 r=E.teamScore([0,0,0,0],[6,0,7,0],9,0);assert.equal(r.nilPoints,-200);assert.equal(r.bagsEarned,13);assert.equal(r.bagPenalty,200);assert.equal(r.bags,2);assert.equal(r.total,-387);
});
test('target reached only at hand end; compare both totals, ties continue, no negative knockout',()=>{
 assert.equal(E.matchWinner([500,490],500),0);assert.equal(E.matchWinner([501,510],500),1);assert.equal(E.matchWinner([520,520],500),null);assert.equal(E.matchWinner([-500,20],500),null);assert.equal(E.matchWinner([250,249],250),0);
});
test('AI only receives own hand and public play, preserves its inputs',()=>{
 const s=E.start({deck:E.shuffled(rng(3))}),v=E.viewFor(s,0),before=JSON.stringify(v);assert.equal('hands' in v,false);assert.equal('deck' in v,false);E.chooseAction(v);assert.equal(JSON.stringify(v),before);
});
test('200 complete matches preserve 52 cards, legal plays, scoring and save replay',()=>{
 for(let seed=1;seed<=200;seed++){
  const random=rng(seed),initial={deck:E.shuffled(random),dealer:seed%4,target:seed%2?250:500};let s=E.start(initial);const actions=[];let turns=0;
  while(s.phase!=='matchOver'){
   assert.ok(++turns<15000,`Match ${seed} must finish`);
   const cards=[...s.hands.flat(),...s.trick.map(p=>p.card),...s.completed.flatMap(t=>t.plays.map(p=>p.card))];assert.equal(cards.length,52);assert.equal(new Set(cards).size,52);
   const a=s.phase==='trick'?{type:'collect'}:s.phase==='handOver'?{type:'nextHand',deck:E.shuffled(random)}:E.chooseAction(E.viewFor(s,s.turn));
   const before=s;s=E.step(s,a);actions.push(a);
   if(a.type==='play'&&E.card(a.card).suit==='S')assert.equal(s.broken,true);
   if(a.type==='nextHand'){assert.equal(s.dealer,(before.dealer+1)%4);assert.deepEqual(s.bags,before.bags);}
   if(before.phase==='trick'&&before.completed.length===12){assert.equal(s.taken.reduce((a,b)=>a+b),13);assert.equal(s.hands.flat().length,0);for(const r of s.result){assert.equal(s.score[r.team],before.score[r.team]+r.total);assert.ok(s.bags[r.team]>=0&&s.bags[r.team]<=9);}}
  }
  assert.equal(s.winner,E.matchWinner(s.score,s.target));if(seed<=4)assert.deepEqual(E.restore({version:1,initial,actions}),s);
 }
});
test('replay rejects damaged decks, actions and out-of-turn phases',()=>{
 assert.throws(()=>E.restore(null));const initial={deck:E.shuffled(rng(8))};assert.throws(()=>E.restore({version:1,initial,actions:[{type:'play',card:initial.deck[0]}]}));
 assert.throws(()=>E.start({deck:Array(52).fill('AS')}));assert.throws(()=>E.start({target:100}));
});
