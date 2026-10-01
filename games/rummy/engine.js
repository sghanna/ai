'use strict';
const Rummy = (() => {
  const suits = ['C','D','S','H'];
  const deck = () => suits.flatMap(suit => Array.from({length:13}, (_,i) => suit+(i+1)));
  function card(id) {
    if (typeof id !== 'string' || !/^[CDSH](?:[1-9]|1[0-3])$/.test(id)) throw Error('Unknown card.');
    const value=Number(id.slice(1));
    return {id,suit:id[0],value,rank:({1:'A',11:'J',12:'Q',13:'K'})[value]||String(value)};
  }
  const points = id => Math.min(card(id).value,10);
  const total = hand => hand.reduce((n,id)=>n+points(id),0);
  function shuffled(random=Math.random) { const d=deck(); for(let i=d.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[d[i],d[j]]=[d[j],d[i]];} return d; }
  function checkDeck(d) {if(!Array.isArray(d)||d.length!==52||new Set(d).size!==52)throw Error('Invalid deck.');d.forEach(card);}
  function sorted(hand,by='suit') {return [...hand].sort((a,b)=>{const x=card(a),y=card(b);return by==='rank'?x.value-y.value||suits.indexOf(x.suit)-suits.indexOf(y.suit):suits.indexOf(x.suit)-suits.indexOf(y.suit)||x.value-y.value;});}
  function meldKind(ids) {
    if(!Array.isArray(ids)||ids.length<3||new Set(ids).size!==ids.length)return null;
    const cs=ids.map(card).sort((a,b)=>a.value-b.value);
    if(cs.length<=4&&cs.every(c=>c.value===cs[0].value))return 'set';
    if(cs.every((c,i)=>c.suit===cs[0].suit&&(i===0||c.value===cs[i-1].value+1)))return 'run';
    return null;
  }
  function canAdd(meld,ids) {return ids.length>0&&meldKind([...meld.cards,...ids])===meld.kind;}
  function deal(s,d) {
    checkDeck(d);s.stock=[...d];s.hands=[[],[]];
    for(let i=0;i<10;i++)for(let p=0;p<2;p++)s.hands[(s.dealer+1+p)%2].push(s.stock.pop());
    s.discard=[s.stock.pop()];s.melds=[];s.turn=1-s.dealer;s.phase='draw';s.takenDiscard=null;s.recycles=0;s.idle=0;s.progress=false;s.result=null;s.last=[];s.turnLog=[];s.turnNumber=1;
    return s;
  }
  function start({deck:d=shuffled(),dealer=1,target=100}={}) {
    if(![0,1].includes(dealer)||![100,200].includes(target))throw Error('Invalid match settings.');
    return deal({version:1,dealer,target,score:[0,0],handNumber:1,winner:null},d);
  }
  function finish(s,winner,reason) {
    const values=s.hands.map(total),blocked=winner===null;
    if(blocked)winner=values[0]===values[1]?null:values[0]<values[1]?0:1;
    const earned=winner===null?0:blocked?Math.abs(values[0]-values[1]):values[1-winner];
    if(winner!==null)s.score[winner]+=earned;
    s.result={winner,earned,values,reason};s.phase=Math.max(...s.score)>=s.target?'matchOver':'handOver';
    if(s.phase==='matchOver')s.winner=s.score[0]>s.score[1]?0:1;
    s.last=[...s.turnLog];return s;
  }
  function stockAvailable(s) {return s.stock.length>0||(s.recycles<2&&s.discard.length>1);}
  function ownSelection(s,ids) {if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||!ids.every(id=>s.hands[s.turn].includes(id)))throw Error('Choose cards from your hand.');}
  function step(state,action) {
    if(!action||typeof action.type!=='string')throw Error('Choose an action.');
    const s=structuredClone(state),p=s.turn,a=action;
    if(a.type==='nextHand') {if(s.phase!=='handOver')throw Error('This hand is still in progress.');s.handNumber++;s.dealer=1-s.dealer;return deal(s,a.deck);}
    if(s.phase==='draw') {
      if(a.type==='endBlocked') {if(stockAvailable(s))throw Error('The stock is still available.');return finish(s,null,'Stock exhausted');}
      if(a.type!=='draw'||!['stock','discard'].includes(a.source))throw Error('Draw a card first.');
      s.turnLog=[];s.progress=false;
      if(a.source==='stock') {
        if(!stockAvailable(s))throw Error('The stock is exhausted. Take the discard or end this hand.');
        if(!s.stock.length) {const top=s.discard.pop();s.stock=s.discard.reverse();s.discard=[top];s.recycles++;s.turnLog.push('Recycled the discard pile.');}
        s.hands[p].push(s.stock.pop());s.takenDiscard=null;s.turnLog.push('Drew from the stock.');
      } else {
        if(!s.discard.length)throw Error('There is no discard to take.');
        s.takenDiscard=s.discard.pop();s.hands[p].push(s.takenDiscard);s.turnLog.push('Took '+s.takenDiscard+' from the discard.');
      }
      s.phase='play';return s;
    }
    if(s.phase!=='play')throw Error('This hand is complete.');
    if(a.type==='meld'||a.type==='add') {
      ownSelection(s,a.cards);
      if(a.type==='meld') {
        const kind=meldKind(a.cards);if(!kind)throw Error('Choose three or more cards in a set or a same-suit run.');
        s.melds.push({kind,cards:sorted(a.cards),owner:p});s.turnLog.push('Laid down '+sorted(a.cards).join(' ') +'.');
      } else {
        const m=s.melds[a.meld];if(!m||!canAdd(m,a.cards))throw Error('Those cards do not extend this set or run.');
        m.cards=sorted([...m.cards,...a.cards]);s.turnLog.push('Added '+a.cards.join(' ')+' to the table.');
      }
      s.hands[p]=s.hands[p].filter(id=>!a.cards.includes(id));
      if(s.hands[p].length===1&&s.hands[p][0]===s.takenDiscard&&!s.melds.some(m=>canAdd(m,s.hands[p])))throw Error('Keep another card to discard. The card you just took cannot be your only card unless you can add it to the table.');
      s.idle=0;s.progress=true;
      return s.hands[p].length? s:finish(s,p,'Went out');
    }
    if(a.type==='discard') {
      ownSelection(s,[a.card]);if(a.card===s.takenDiscard)throw Error('Keep the card you just took from the discard until a later turn.');
      s.hands[p]=s.hands[p].filter(id=>id!==a.card);s.discard.push(a.card);s.turnLog.push('Discarded '+a.card+'.');
      if(!s.hands[p].length)return finish(s,p,'Went out');
      s.last=[...s.turnLog];s.turn=1-p;s.phase='draw';s.takenDiscard=null;s.turnNumber++;s.idle=s.progress?0:s.idle+1;
      if(s.idle>=40)return finish(s,null,'40 turns without a table play');
      return s;
    }
    throw Error('That move is not available.');
  }
  function meldsIn(hand) {
    const found=[];
    for(let v=1;v<=13;v++){const group=hand.filter(id=>card(id).value===v);if(group.length>=3){found.push(group);if(group.length===4)for(let i=0;i<4;i++)found.push(group.filter((_,j)=>j!==i));}}
    for(const suit of suits){const same=sorted(hand.filter(id=>card(id).suit===suit));for(let i=0;i<same.length;i++){const run=[same[i]];for(let j=i+1;j<same.length&&card(same[j]).value===card(same[j-1]).value+1;j++){run.push(same[j]);if(run.length>=3)found.push([...run]);}}}
    return found;
  }
  // Bot receives its own hand and the visible table, never stock order/opponent cards.
  function viewFor(s,p=s.turn) {return {hand:[...s.hands[p]],phase:s.phase,turn:s.turn,player:p,top:s.discard.at(-1)||null,stockAvailable:stockAvailable(s),melds:structuredClone(s.melds),takenDiscard:s.takenDiscard};}
  function bestMeld(hand) {return meldsIn(hand).sort((a,b)=>b.length-a.length||total(b)-total(a))[0];}
  function chooseAction(v) {
    if(v.phase==='draw') {
      const take=v.top && (meldsIn([...v.hand,v.top]).some(m=>m.includes(v.top))||v.melds.some(m=>canAdd(m,[v.top])));
      if(take)return {type:'draw',source:'discard'};
      return v.stockAvailable?{type:'draw',source:'stock'}:{type:'endBlocked'};
    }
    if(v.phase!=='play')throw Error('No move required.');
    const safe=(ids,table)=>{const rest=v.hand.filter(id=>!ids.includes(id));return rest.length!==1||rest[0]!==v.takenDiscard||table.some(m=>canAdd(m,rest));};
    const meld=meldsIn(v.hand).sort((a,b)=>b.length-a.length||total(b)-total(a)).find(ids=>safe(ids,[...v.melds,{kind:meldKind(ids),cards:ids}]));if(meld)return {type:'meld',cards:meld};
    for(let i=0;i<v.melds.length;i++)for(const id of v.hand)if(canAdd(v.melds[i],[id])&&safe([id],v.melds.map((m,j)=>j===i?{...m,cards:[...m.cards,id]}:m)))return {type:'add',meld:i,cards:[id]};
    const utility=id=>{const c=card(id);return v.hand.reduce((n,x)=>{if(x===id)return n;const d=card(x);return n+(c.value===d.value?6:c.suit===d.suit&&Math.abs(c.value-d.value)<=2?3:0);},0)-points(id)/12;};
    const choice=v.hand.filter(id=>id!==v.takenDiscard).sort((a,b)=>utility(a)-utility(b)||points(b)-points(a))[0];
    if(!choice)throw Error('No discard available.');return {type:'discard',card:choice};
  }
  function restore(record) {
    if(!record||record.version!==1||!record.initial||!Array.isArray(record.actions)||record.actions.length>30000)throw Error('Invalid save.');
    checkDeck(record.initial.deck);if(![0,1].includes(record.initial.dealer)||![100,200].includes(record.initial.target))throw Error('Invalid saved settings.');
    let s=start(record.initial);for(const a of record.actions)s=step(s,a);return s;
  }
  return {deck,card,points,total,shuffled,sorted,meldKind,canAdd,start,step,meldsIn,viewFor,chooseAction,stockAvailable,restore};
})();
if(typeof module!=='undefined')module.exports=Rummy;
