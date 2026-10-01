/* Partnership Spades. Pure rules; bots receive only their own cards and public play. */
(function(root){
  'use strict';
  const SUITS=['S','H','C','D'],RANKS=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const CARDS=Object.fromEntries(SUITS.flatMap(suit=>RANKS.map(rank=>[rank+suit,{id:rank+suit,rank,suit}])));
  const card=id=>CARDS[id],strength=id=>RANKS.indexOf(card(id).rank)+2;
  const check=(ok,message)=>{if(!ok)throw new Error(message);};
  const validDeck=deck=>Array.isArray(deck)&&deck.length===52&&new Set(deck).size===52&&deck.every(id=>CARDS[id]);
  function shuffled(random=Math.random){const deck=Object.keys(CARDS);for(let i=51;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}return deck;}
  function deal(s,deck){
    check(validDeck(deck),'Invalid deck');s.hands=[[],[],[],[]];
    deck.forEach((id,n)=>s.hands[(s.dealer+1+n)%4].push(id));
    Object.assign(s,{phase:'bid',turn:(s.dealer+1)%4,bids:[null,null,null,null],taken:[0,0,0,0],broken:false,trick:[],completed:[],result:null,winner:null});return s;
  }
  function start({deck=shuffled(),dealer=3,target=500}={}){
    check(Number.isInteger(dealer)&&dealer>=0&&dealer<=3,'Invalid dealer');check([250,500].includes(target),'Invalid target');
    return deal({version:1,dealer,target,score:[0,0],bags:[0,0],handNumber:1},deck);
  }
  function legalCards(hand,trick,broken){
    if(!trick.length){const plain=hand.filter(id=>card(id).suit!=='S');return !broken&&plain.length?plain:[...hand];}
    const led=card(trick[0].card).suit,matching=hand.filter(id=>card(id).suit===led);return matching.length?matching:[...hand];
  }
  function winningPlay(trick){
    if(!trick.length)return null;const led=card(trick[0].card).suit;
    const value=id=>(card(id).suit==='S'?100:card(id).suit===led?50:0)+strength(id);
    return trick.reduce((a,b)=>value(b.card)>value(a.card)?b:a);
  }
  function teamScore(bids,taken,priorBags,team){
    const players=[team,team+2],bid=players.reduce((n,p)=>n+bids[p],0);
    const regularTaken=players.filter(p=>bids[p]!==0).reduce((n,p)=>n+taken[p],0);
    const nils=players.filter(p=>bids[p]===0).map(player=>({player,tricks:taken[player],success:taken[player]===0,points:taken[player]===0?100:-100}));
    const made=regularTaken>=bid,contractPoints=made?bid*10:-bid*10;
    const bagsEarned=(made?regularTaken-bid:0)+nils.reduce((n,r)=>n+r.tricks,0);
    const bagPenalty=Math.floor((priorBags+bagsEarned)/10)*100,bags=(priorBags+bagsEarned)%10;
    const nilPoints=nils.reduce((n,r)=>n+r.points,0);
    return {team,bid,taken:regularTaken,made,contractPoints,nils,nilPoints,bagsEarned,bagPenalty,priorBags,bags,total:contractPoints+nilPoints+bagsEarned-bagPenalty};
  }
  function matchWinner(score,target){return Math.max(...score)>=target&&score[0]!==score[1]?(score[0]>score[1]?0:1):null;}
  function step(state,action){
    check(action&&typeof action.type==='string','Invalid action');const s=JSON.parse(JSON.stringify(state));
    if(action.type==='bid'){
      check(s.phase==='bid','Not bidding');check(Number.isInteger(action.bid)&&action.bid>=0&&action.bid<=13,'Bid from Nil to 13');
      s.bids[s.turn]=action.bid;
      if(s.bids.every(b=>b!==null)){s.phase='play';s.turn=(s.dealer+1)%4;}else s.turn=(s.turn+1)%4;
    }else if(action.type==='play'){
      check(s.phase==='play','Not playing');check(legalCards(s.hands[s.turn],s.trick,s.broken).includes(action.card),'Follow suit; lead spades only when allowed');
      s.hands[s.turn].splice(s.hands[s.turn].indexOf(action.card),1);s.trick.push({player:s.turn,card:action.card});
      if(card(action.card).suit==='S')s.broken=true;
      if(s.trick.length===4){s.phase='trick';s.turn=winningPlay(s.trick).player;}else s.turn=(s.turn+1)%4;
    }else if(action.type==='collect'){
      check(s.phase==='trick','Trick is incomplete');s.taken[s.turn]++;s.completed.push({plays:s.trick,winner:s.turn});s.trick=[];
      if(s.completed.length===13){
        s.result=[0,1].map(team=>teamScore(s.bids,s.taken,s.bags[team],team));
        s.result.forEach(r=>{s.score[r.team]+=r.total;s.bags[r.team]=r.bags;});
        s.winner=matchWinner(s.score,s.target);s.phase=s.winner===null?'handOver':'matchOver';
      }else s.phase='play';
    }else if(action.type==='nextHand'){
      check(s.phase==='handOver','Hand is not over');s.dealer=(s.dealer+1)%4;s.handNumber++;deal(s,action.deck);
    }else throw new Error('Unknown action');return s;
  }
  function viewFor(s,player){return {player,hand:[...s.hands[player]],phase:s.phase,dealer:s.dealer,target:s.target,bids:[...s.bids],taken:[...s.taken],score:[...s.score],bags:[...s.bags],broken:s.broken,trick:s.trick.map(p=>({...p})),completed:JSON.parse(JSON.stringify(s.completed))};}
  function chooseBid(v){
    const groups=SUITS.map(suit=>v.hand.filter(id=>card(id).suit===suit));const spades=groups[0];
    const nilSafe=spades.length<=2&&spades.every(id=>strength(id)<=8)&&groups.slice(1).every(g=>g.every(id=>strength(id)<=10)||(g.length>=5&&g.every(id=>strength(id)<=12)));
    if(nilSafe&&v.bids[(v.player+2)%4]!==0)return {type:'bid',bid:0};
    let estimate=0;
    for(const g of groups.slice(1))for(const id of g){const r=strength(id);estimate+=r===14?1:r===13?(g.length>=2?.7:.25):r===12&&g.length>=3?.3:0;}
    for(const id of spades){const r=strength(id);estimate+=r===14?1:r===13?.85:r===12?.65:r===11?.45:0;}
    estimate+=Math.max(0,spades.length-3)*.65;
    if(spades.length>=3)estimate+=groups.slice(1).filter(g=>g.length<=1).length*.5;
    return {type:'bid',bid:Math.max(1,Math.min(13,Math.round(estimate)))};
  }
  function choosePlay(v){
    const legal=legalCards(v.hand,v.trick,v.broken),partner=(v.player+2)%4;
    const cost=id=>(card(id).suit==='S'?30:0)+strength(id);
    const low=cards=>cards.slice().sort((a,b)=>cost(a)-cost(b))[0];
    const high=cards=>cards.slice().sort((a,b)=>cost(b)-cost(a))[0];
    const current=winningPlay(v.trick),wins=id=>winningPlay([...v.trick,{player:v.player,card:id}]).player===v.player;
    if(v.bids[v.player]===0&&v.taken[v.player]===0){
      if(!current)return low(legal);
      const losing=legal.filter(id=>!wins(id));return losing.length?high(losing):low(legal);
    }
    if(v.bids[partner]===0&&v.taken[partner]===0){
      if(!current)return high(legal);
      const partnerPlay=v.trick.find(p=>p.player===partner);
      if(!partnerPlay||current.player===partner){const winning=legal.filter(wins);if(winning.length)return high(winning);}
    }
    const team=[v.player,partner],regularTaken=team.filter(p=>v.bids[p]!==0).reduce((n,p)=>n+v.taken[p],0),contract=team.reduce((n,p)=>n+v.bids[p],0);
    const need=regularTaken<contract;
    if(!current){
      if(need){const known=new Set([...v.hand,...v.completed.flatMap(t=>t.plays.map(p=>p.card))]);const sure=legal.filter(id=>Object.keys(CARDS).every(c=>card(c).suit!==card(id).suit||known.has(c)||strength(c)<strength(id)));if(sure.length)return high(sure);}
      return low(legal);
    }
    const winning=legal.filter(wins),losing=legal.filter(id=>!wins(id));
    const nilOpponentWinning=v.bids[current.player]===0&&current.player%2!==v.player%2&&v.taken[current.player]===0;
    if(nilOpponentWinning&&losing.length)return high(losing);
    if(current.player%2===v.player%2)return low(legal);
    if(need&&winning.length)return low(winning);
    return losing.length?high(losing):low(legal);
  }
  function chooseAction(v){if(v.phase==='bid')return chooseBid(v);if(v.phase==='play')return {type:'play',card:choosePlay(v)};throw new Error('No computer decision now');}
  function restore(record){
    check(record&&record.version===1&&record.initial&&Array.isArray(record.actions)&&record.actions.length<=50000,'Invalid save');check(validDeck(record.initial.deck),'Missing saved deck');
    let s=start(record.initial);for(const action of record.actions)s=step(s,action);return s;
  }
  const api={SUITS,RANKS,card,strength,validDeck,shuffled,start,step,legalCards,winningPlay,teamScore,matchWinner,viewFor,chooseBid,choosePlay,chooseAction,restore};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Spades=api;
})(typeof globalThis!=='undefined'?globalThis:this);
