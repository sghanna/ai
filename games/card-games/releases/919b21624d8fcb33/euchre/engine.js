/* Euchre rules and computer play. No DOM, storage, timers, or hidden-hand access in AI. */
(function (root) {
  'use strict';
  const SUITS = ['S', 'H', 'C', 'D'];
  const RANKS = ['9', '10', 'J', 'Q', 'K', 'A'];
  const PAIR = {S:'C', C:'S', H:'D', D:'H'};
  const CARDS = Object.fromEntries(SUITS.flatMap(suit => RANKS.map(rank => [rank+suit, {id:rank+suit, rank, suit}])));
  const card = id => CARDS[id];
  const effectiveSuit = (id, trump) => card(id).rank === 'J' && card(id).suit === PAIR[trump] ? trump : card(id).suit;
  const isRight = (id, trump) => id === 'J'+trump;
  const isLeft = (id, trump) => id === 'J'+PAIR[trump];
  function strength(id, trump) {
    if (isRight(id,trump)) return 8;
    if (isLeft(id,trump)) return 7;
    return RANKS.indexOf(card(id).rank)+1;
  }
  function shuffled(random = Math.random) {
    const deck = Object.keys(CARDS);
    for (let i=deck.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [deck[i],deck[j]]=[deck[j],deck[i]]; }
    return deck;
  }
  function requireThat(ok, message) { if (!ok) throw new Error(message); }
  function validDeck(deck) { return Array.isArray(deck) && deck.length===24 && new Set(deck).size===24 && deck.every(id=>CARDS[id]); }
  function nextSeat(s, from) { let seat=(from+1)%4; if (seat===s.sittingOut) seat=(seat+1)%4; return seat; }
  function deal(s, deck) {
    requireThat(validDeck(deck),'Invalid deck');
    s.hands = [[],[],[],[]];
    let n=0;
    for (const count of [3,2]) for (let p=1;p<=4;p++) for(let c=0;c<count;c++) s.hands[(s.dealer+p)%4].push(deck[n++]);
    Object.assign(s, {kitty:deck.slice(20),upcard:deck[20],round:1,turn:(s.dealer+1)%4,phase:'bid',trump:null,maker:null,alone:false,sittingOut:null,trick:[],completed:[],tricks:[0,0],bids:[],result:null});
    return s;
  }
  function start({deck=shuffled(),dealer=3,stickDealer=true}={}) {
    requireThat(Number.isInteger(dealer)&&dealer>=0&&dealer<4,'Invalid dealer');
    requireThat(typeof stickDealer==='boolean','Invalid rule');
    return deal({version:1,dealer,stickDealer,score:[0,0],handNumber:1},deck);
  }
  function winningPlay(trick, trump) {
    if (!trick.length) return null;
    const led=effectiveSuit(trick[0].card,trump);
    const value=id => (effectiveSuit(id,trump)===trump ? 100 : effectiveSuit(id,trump)===led ? 50 : 0)+strength(id,trump);
    return trick.reduce((best,play)=>value(play.card)>value(best.card)?play:best);
  }
  function legalCards(hand, trick, trump) {
    if (!trick.length) return [...hand];
    const led=effectiveSuit(trick[0].card,trump), matching=hand.filter(id=>effectiveSuit(id,trump)===led);
    return matching.length?matching:[...hand];
  }
  function beginPlay(s) { s.phase='play';s.turn=nextSeat(s,s.dealer); }
  function points(maker, tricks, alone) {
    const team=maker%2, count=tricks[team];
    return count<3 ? {team:1-team,points:2,kind:'euchre'} : {team,points:count===5?(alone?4:2):1,kind:count===5?(alone?'lone-march':'march'):'made'};
  }
  function step(state, action) {
    requireThat(action && typeof action.type==='string','Invalid action');
    const s=JSON.parse(JSON.stringify(state));
    if (action.type==='bid') {
      requireThat(s.phase==='bid','Not bidding');
      const suit=action.suit;
      if (suit===null) {
        requireThat(!(s.round===2&&s.turn===s.dealer&&s.stickDealer),'Dealer must choose trump');
        s.bids.push({player:s.turn,round:s.round,suit:null});
        if (s.turn===s.dealer) { if(s.round===1){s.round=2;s.turn=(s.dealer+1)%4;} else s.phase='redeal'; }
        else s.turn=(s.turn+1)%4;
      } else {
        requireThat(SUITS.includes(suit),'Choose a suit');
        requireThat(s.round===1 ? suit===card(s.upcard).suit : suit!==card(s.upcard).suit,'Suit unavailable');
        requireThat(action.alone===undefined || typeof action.alone==='boolean','Invalid lone call');
        Object.assign(s,{trump:suit,maker:s.turn,alone:!!action.alone,sittingOut:action.alone?(s.turn+2)%4:null});
        s.bids.push({player:s.turn,round:s.round,suit,alone:s.alone});
        if (s.round===1) { s.hands[s.dealer].push(s.kitty.shift());s.phase='discard';s.turn=s.dealer; }
        else beginPlay(s);
      }
    } else if (action.type==='discard') {
      requireThat(s.phase==='discard','Not discarding');
      const index=s.hands[s.dealer].indexOf(action.card);
      requireThat(index!==-1,'Card not in hand');
      s.kitty.push(s.hands[s.dealer].splice(index,1)[0]);beginPlay(s);
    } else if (action.type==='play') {
      requireThat(s.phase==='play','Not playing');
      requireThat(legalCards(s.hands[s.turn],s.trick,s.trump).includes(action.card),'Follow suit if possible');
      s.hands[s.turn].splice(s.hands[s.turn].indexOf(action.card),1);
      s.trick.push({player:s.turn,card:action.card});
      if (s.trick.length===(s.alone?3:4)) { s.phase='trick';s.turn=winningPlay(s.trick,s.trump).player; }
      else s.turn=nextSeat(s,s.turn);
    } else if (action.type==='collect') {
      requireThat(s.phase==='trick','Trick is incomplete');
      s.tricks[s.turn%2]++;
      s.completed.push({plays:s.trick,winner:s.turn});s.trick=[];
      if (s.completed.length===5) {s.result=points(s.maker,s.tricks,s.alone);s.score[s.result.team]+=s.result.points;s.phase=s.score.some(n=>n>=10)?'matchOver':'handOver';}
      else s.phase='play';
    } else if (action.type==='nextHand') {
      requireThat(['handOver','redeal'].includes(s.phase),'Hand is not over');
      s.dealer=(s.dealer+1)%4;s.handNumber++;deal(s,action.deck);
    } else throw new Error('Unknown action');
    return s;
  }
  // Only a player's own hand and public information cross this boundary.
  function viewFor(s,player) {
    return {player,hand:[...s.hands[player]],phase:s.phase,round:s.round,dealer:s.dealer,upcard:s.upcard,trump:s.trump,maker:s.maker,alone:s.alone,sittingOut:s.sittingOut,trick:s.trick.map(p=>({...p})),completed:JSON.parse(JSON.stringify(s.completed)),bids:s.bids.map(b=>({...b})),score:[...s.score],stickDealer:s.stickDealer};
  }
  function handValue(hand,trump) {
    const weights={8:3.4,7:2.7,6:2,5:1.3,4:1,2:.7,1:.5};
    const trumps=hand.filter(id=>effectiveSuit(id,trump)===trump);
    const off=hand.filter(id=>effectiveSuit(id,trump)!==trump);
    return trumps.reduce((n,id)=>n+(weights[strength(id,trump)]||.8),0)+off.filter(id=>card(id).rank==='A').length*1.3+(trumps.length>=3?.6:0)+(new Set(off.map(id=>effectiveSuit(id,trump))).size<=1&&trumps.length>=2?.5:0);
  }
  function chooseDiscard(hand,trump) {
    return hand.reduce((best,id)=>handValue(hand.filter(c=>c!==id),trump)>handValue(hand.filter(c=>c!==best),trump)?id:best);
  }
  function chooseBid(v) {
    const suits=v.round===1?[card(v.upcard).suit]:SUITS.filter(s=>s!==card(v.upcard).suit);
    const rated=suits.map(suit=>{
      let hand=[...v.hand];
      if (v.round===1&&v.player===v.dealer){hand.push(v.upcard);const discard=chooseDiscard(hand,suit);hand=hand.filter(c=>c!==discard);}
      let value=handValue(hand,suit);
      if(v.round===1&&v.player!==v.dealer) value+=v.player%2===v.dealer%2?.7:-.5;
      return {suit,value,hand};
    }).sort((a,b)=>b.value-a.value);
    const best=rated[0], forced=v.round===2&&v.player===v.dealer&&v.stickDealer;
    if(best.value<6.2&&!forced) return {type:'bid',suit:null};
    const alone=best.value>=10&&best.hand.includes('J'+best.suit)&&best.hand.filter(id=>effectiveSuit(id,best.suit)===best.suit).length>=3;
    return {type:'bid',suit:best.suit,alone};
  }
  function choosePlay(v) {
    const legal=legalCards(v.hand,v.trick,v.trump);
    const cost=id=>(effectiveSuit(id,v.trump)===v.trump?20:0)+strength(id,v.trump);
    const low=ids=>ids.slice().sort((a,b)=>cost(a)-cost(b))[0];
    if(!v.trick.length){
      const known=new Set([...v.hand,...v.completed.flatMap(t=>t.plays.map(p=>p.card))]);
      const trumps=v.hand.filter(id=>effectiveSuit(id,v.trump)===v.trump);
      const top=trumps.find(id=>Object.keys(CARDS).every(c=>effectiveSuit(c,v.trump)!==v.trump||known.has(c)||strength(c,v.trump)<strength(id,v.trump)));
      if(top&&v.player%2===v.maker%2) return top;
      const ace=v.hand.find(id=>card(id).rank==='A'&&effectiveSuit(id,v.trump)!==v.trump);
      return ace||low(legal);
    }
    const winner=winningPlay(v.trick,v.trump);
    if(winner.player%2===v.player%2) return low(legal);
    const winning=legal.filter(id=>winningPlay([...v.trick,{player:v.player,card:id}],v.trump).player===v.player);
    return low(winning.length?winning:legal);
  }
  function chooseAction(v) {
    if(v.phase==='bid') return chooseBid(v);
    if(v.phase==='discard') return {type:'discard',card:chooseDiscard(v.hand,v.trump)};
    if(v.phase==='play') return {type:'play',card:choosePlay(v)};
    throw new Error('No computer decision in this phase');
  }
  function restore(record) {
    requireThat(record&&record.version===1&&record.initial&&Array.isArray(record.actions)&&record.actions.length<=5000,'Invalid save');
    requireThat(validDeck(record.initial.deck),'Missing saved deck');
    let s=start(record.initial);
    for (const action of record.actions) s=step(s,action);
    return s;
  }
  const api={SUITS,RANKS,PAIR,card,effectiveSuit,isRight,isLeft,strength,shuffled,start,step,nextSeat,winningPlay,legalCards,points,viewFor,chooseAction,chooseBid,chooseDiscard,choosePlay,restore,validDeck};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  else root.Euchre=api;
})(typeof globalThis!=='undefined'?globalThis:this);
