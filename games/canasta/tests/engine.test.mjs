import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine.js';
const deck=Array.from({length:108},(_,i)=>i),ids=rank=>deck.filter(id=>E.card(id).rank===rank),black3=ids('3').filter(id=>!E.card(id).red),reds=ids('3').filter(E.redThree);
function fixture({hand=[],melds={},other={},discard=[],stock=null,score=0,phase='meld',frozen=false}={}) {
 const s=E.newGame(1);s.hands=[hand,[],[],[]];s.teams=[{melds,reds:[]},{melds:other,reds:[]}];s.discard=discard;s.scores=[score,0];s.stock=stock??deck.filter(id=>![...hand,...Object.values(melds).flat(),...Object.values(other).flat(),...discard].includes(id));s.player=0;s.phase=phase;s.frozen=frozen;s.turn={melded:false,wasMelded:false,existing:Object.keys(melds),usedExisting:false,fromPile:false,mustOut:false};return s;
}
function rejects(s,a,re){const before=JSON.stringify(s);assert.throws(()=>E.act(s,a),re);assert.equal(JSON.stringify(s),before,'invalid action must not mutate');}
test('108 distinct cards, seeded deals, automatic red-three replacements',()=>{
 assert.equal(deck.length,108);assert.equal(deck.filter(id=>E.card(id).wild).length,12);assert.equal(reds.length,4);
 for(let seed=0;seed<200;seed++){const s=E.newGame(seed);assert.ok(E.validate(s));assert.deepEqual(s,E.newGame(seed));assert.ok(s.hands.every(h=>h.length===11));assert.ok(s.hands.flat().every(id=>!E.redThree(id)));}
});
test('opening thresholds combine drafts; natural/wild limits; invalid moves atomic',()=>{
 assert.deepEqual([-1,0,1495,1500,2995,3000].map(E.minimum),[15,50,50,90,90,120]);
 let s=fixture({hand:[...ids('4').slice(0,3),...ids('K').slice(0,3),...ids('9').slice(0,2)]});
 rejects(s,{type:'meld',groups:[{rank:'4',ids:ids('4').slice(0,3)}]},/50 points/);
 rejects(s,{type:'meld',groups:[{rank:'4',ids:ids('4').slice(0,3)},{rank:'K',ids:ids('K').slice(0,3)}]},/45/);
 s.hands[0].push(ids('K')[3]);s.stock=s.stock.filter(id=>id!==ids('K')[3]);
 s=E.act(s,{type:'meld',groups:[{rank:'4',ids:ids('4').slice(0,3)},{rank:'K',ids:ids('K').slice(0,4)}]});assert.equal(Object.keys(s.teams[0].melds).length,2);
 s=fixture({hand:[...ids('A').slice(0,2),...ids('2').slice(0,4),...ids('K').slice(0,2)]});
 rejects(s,{type:'meld',groups:[{rank:'A',ids:s.hands[0].slice(0,6)}]},/at most three/);
 rejects(s,{type:'meld',groups:[{rank:'A',ids:[ids('A')[0],ids('2')[0],ids('2')[1]]}]},/two matching/);
 rejects(s,{type:'meld',groups:[{rank:'A',ids:[ids('A')[0],ids('A')[0],ids('2')[0]]}]},/once/);
});
test('frozen pickup requires natural pair; buried cards cannot open team',()=>{
 const pair=ids('K').slice(0,2),top=ids('K')[2],q=ids('Q').slice(0,2),wild=104;
 let s=fixture({hand:[...pair,...q,wild,...ids('9').slice(0,2)],discard:[ids('K')[3],ids('Q')[2],top],phase:'draw',score:1500,frozen:true});
 const groups=[{rank:'K',ids:pair},{rank:'Q',ids:[...q,wild]}];
 assert.equal(E.preview(s,groups,true).points,100);s=E.act(s,{type:'take',groups});assert.equal(s.discard.length,0);assert.equal(s.frozen,false);assert.equal(s.teams[0].melds.K.length,3);assert.ok(s.hands[0].includes(ids('K')[3]));
 s=fixture({hand:[...pair,...q,ids('2')[0],...ids('9').slice(0,2)],discard:[ids('K')[3],ids('Q')[2],top],phase:'draw',score:1500,frozen:true});
 rejects(s,{type:'take',groups:[{rank:'K',ids:pair},{rank:'Q',ids:[...q,ids('2')[0]]}]},/total 70/);
 rejects(s,{type:'take',groups:[{rank:'K',ids:[pair[0],ids('2')[0]]}]},/two matching/);
});
test('unfrozen pickup onto meld; one natural plus wild; special cards block',()=>{
 let s=fixture({hand:ids('9').slice(0,2),melds:{K:ids('K').slice(0,3)},discard:[ids('8')[0],ids('K')[3]],phase:'draw'});
 s=E.act(s,{type:'take',groups:[]});assert.equal(s.teams[0].melds.K.length,4);assert.equal(s.hands[0].length,3);
 s=fixture({hand:[ids('Q')[0],104,...ids('9').slice(0,2)],melds:{K:ids('K').slice(0,3)},discard:[ids('Q')[1]],phase:'draw'});
 s=E.act(s,{type:'take',groups:[{rank:'Q',ids:[ids('Q')[0],104]}]});assert.equal(s.teams[0].melds.Q.length,3);
 for(const top of [104,ids('2')[0],black3[0],reds[0]]){s=fixture({hand:ids('9').slice(0,3),discard:[top],phase:'draw'});rejects(s,{type:'take',groups:[]},/blocks/);}
});
test('black three only blocks one turn; wild freezes until pickup',()=>{
 let s=fixture({hand:[black3[0],ids('9')[0]],discard:[ids('K')[0]]});s=E.act(s,{type:'discard',id:black3[0]});assert.equal(s.frozen,false);assert.match(E.pileReason(s),/blocks/);
 s=fixture({hand:[104,ids('9')[0]]});s=E.act(s,{type:'discard',id:104});assert.equal(s.frozen,true);
});
test('keep two without canasta; going out with or without discard; concealed bonus',()=>{
 let s=fixture({hand:[...ids('A').slice(0,3),ids('K')[0]]});rejects(s,{type:'meld',groups:[{rank:'A',ids:ids('A').slice(0,3)}]},/Keep two/);
 s=fixture({hand:[ids('A')[7]],melds:{A:ids('A').slice(0,7)}});s=E.act(s,{type:'meld',groups:[{rank:'A',ids:[ids('A')[7]]}]});assert.equal(s.phase,'roundOver');assert.equal(s.result.rows[0].outBonus,100);assert.equal(s.result.rows[0].canastas,500);
 s=fixture({hand:[...ids('4').slice(0,7),ids('K')[0]],score:3000});s=E.act(s,{type:'meld',groups:[{rank:'4',ids:ids('4').slice(0,7)}]});assert.equal(s.turn.mustOut,true);s=E.act(s,{type:'discard',id:ids('K')[0]});assert.equal(s.result.rows[0].outBonus,200);assert.equal(s.result.rows[0].total,735);
});
test('black threes can only meld when going out; no wilds allowed',()=>{
 let s=fixture({hand:[...black3.slice(0,3),ids('9')[0]],melds:{A:ids('A').slice(0,7)}});s=E.act(s,{type:'meld',groups:[{rank:'3',ids:black3.slice(0,3)}]});s=E.act(s,{type:'discard',id:ids('9')[0]});assert.equal(s.result.rows[0].meldPoints,155);
 s=fixture({hand:[...black3.slice(0,3),...ids('9').slice(0,2)],melds:{A:ids('A').slice(0,7)}});rejects(s,{type:'meld',groups:[{rank:'3',ids:black3.slice(0,3)}]},/only be melded/);
});
test('red threes replace from stock, not pile; last red ends hand',()=>{
 let s=fixture({hand:ids('9').slice(0,2),stock:[ids('K')[0],reds[0]],phase:'draw'});s=E.act(s,{type:'draw'});assert.equal(s.teams[0].reds.length,1);assert.equal(s.hands[0].length,3);assert.equal(s.phase,'meld');
 s=fixture({hand:ids('9').slice(0,2),stock:[reds[0]],phase:'draw'});s=E.act(s,{type:'draw'});assert.equal(s.phase,'roundOver');assert.equal(s.result.rows[0].redBonus,-100);
 s=fixture({hand:[...ids('K').slice(0,2),...ids('9').slice(0,2)],discard:[reds[0],ids('K')[2]],score:-10,phase:'draw',frozen:true});const count=s.stock.length;s=E.act(s,{type:'take',groups:[{rank:'K',ids:ids('K').slice(0,2)}]});assert.equal(s.stock.length,count);assert.equal(s.teams[0].reds.length,1);
});
test('empty stock forces matching open pickup; one-card exception; score accounting',()=>{
 let s=fixture({hand:[ids('9')[0],ids('9')[1]],melds:{A:ids('A').slice(0,7)},discard:[ids('A')[7]],stock:[],phase:'draw'});assert.ok(E.forcedPickup(s));rejects(s,{type:'draw'},/must take/);s=E.act(s,{type:'take',groups:[]});assert.equal(s.phase,'meld');
 s=fixture({hand:[ids('9')[0]],melds:{A:ids('A').slice(0,7)},discard:[ids('A')[7]],stock:[],phase:'draw'});assert.ok(!E.forcedPickup(s));rejects(s,{type:'take',groups:[]},/single-card/);s.teams[0].reds=reds;s=E.act(s,{type:'draw'});assert.equal(s.result.rows[0].total,1430);assert.equal(s.result.rows[0].outBonus,0);
});
test('bots do not use concealed hands or stock order',()=>{
 for(let seed=0;seed<50;seed++){const s=E.newGame(seed),a=E.botAction(s),other=structuredClone(s);other.hands[1].reverse();other.hands[2]=[104,105];other.hands[3]=[];other.stock.reverse();assert.deepEqual(E.botAction(other),a);}
});
test('200 complete seeded matches preserve cards, finish, and replay identically',()=>{
 for(let seed=0;seed<200;seed++){let s=E.newGame(seed),record={version:1,seed,actions:[]};while(s.phase!=='matchOver'&&record.actions.length<4000){const a=s.phase==='roundOver'?{type:'next'}:E.botAction(s);s=E.act(s,a);assert.ok(E.validate(s),`${seed}:${record.actions.length}`);record.actions.push(a);}assert.equal(s.phase,'matchOver',String(seed));if(seed<8)assert.deepEqual(E.restore(JSON.parse(JSON.stringify(record))),s);}
});
test('malformed saves and illegal action histories rejected',()=>{
 for(const r of [null,{}, {version:1,seed:1,actions:[{type:'discard',id:0}]},{version:1,seed:1,actions:[{type:'evil'}]}])assert.throws(()=>E.restore(r));
});

test('concealed player may go out after partner opened a different rank',()=>{
 let s=fixture({hand:ids('7').slice(0,7),melds:{Q:ids('Q').slice(0,3)}});
 s=E.act(s,{type:'meld',groups:[{rank:'7',ids:ids('7').slice(0,7)}]});
 assert.equal(s.result.rows[0].outBonus,200);
 s=fixture({hand:[...ids('7').slice(0,7),ids('Q')[3]],melds:{Q:ids('Q').slice(0,3)}});
 s=E.act(s,{type:'meld',groups:[{rank:'7',ids:ids('7').slice(0,7)},{rank:'Q',ids:[ids('Q')[3]]}]});
 assert.equal(s.result.rows[0].outBonus,100);
});
