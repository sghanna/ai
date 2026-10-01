// Classic partnership Canasta. All actions are atomic; the UI keeps drafts separate.
export const RANKS = ['4','5','6','7','8','9','10','J','Q','K','A'];
const ALL_RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
export const NAMES = ['You','West','Partner','East'];
export function card(id) {
  if (!Number.isInteger(id) || id < 0 || id > 107) throw Error('Invalid card.');
  if (id >= 104) return {id,rank:'Joker',suit:'',red:false,wild:true,value:50};
  const n=id%52, rank=ALL_RANKS[n%13], suit=['♣','♦','♥','♠'][Math.floor(n/13)];
  return {id,rank,suit,red:suit==='♦'||suit==='♥',wild:rank==='2',value:rank==='A'||rank==='2'?20:['8','9','10','J','Q','K'].includes(rank)?10:5};
}
export const redThree = id => card(id).rank==='3' && card(id).red;
export const natural = id => RANKS.includes(card(id).rank);
export const value = ids => ids.reduce((n,id)=>n+card(id).value,0);
export const minimum = score => score<0?15:score<1500?50:score<3000?90:120;
export const teamOf = p => p%2;
export const hasCanasta = melds => Object.entries(melds).some(([r,ids])=>r!=='3'&&ids.length>=7);
export function sorted(ids) { return [...ids].sort((a,b)=>{const x=card(a),y=card(b);return [...RANKS,'3','2','Joker'].indexOf(x.rank)-[...RANKS,'3','2','Joker'].indexOf(y.rank)||a%52-b%52||a-b;}); }
function check(ok,message) { if(!ok) throw Error(message); }
function shuffle(seed) {
 let t=seed>>>0; const random=()=>{t+=0x6D2B79F5;let n=Math.imul(t^t>>>15,1|t);n^=n+Math.imul(n^n>>>7,61|n);return ((n^n>>>14)>>>0)/4294967296;};
 const ids=Array.from({length:108},(_,i)=>i);for(let i=107;i>0;i--){const j=Math.floor(random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}return ids;
}
function turnInfo(s) { return {melded:false,wasMelded:s.everMelded[s.player],existing:Object.keys(s.teams[teamOf(s.player)].melds),usedExisting:false,fromPile:false,mustOut:false}; }
export function newGame(seed=Date.now()>>>0) {
 const s={version:1,seed:seed>>>0,round:1,dealer:3,scores:[0,0],history:[],serial:0};deal(s);return s;
}
function deal(s) {
 s.stock=shuffle((s.seed+Math.imul(s.round-1,2654435761))>>>0);s.hands=[[],[],[],[]];s.teams=[{melds:{},reds:[]},{melds:{},reds:[]}];s.discard=[];s.frozen=false;s.everMelded=[false,false,false,false];s.player=(s.dealer+1)%4;s.phase='draw';s.result=null;
 for(let n=0;n<11;n++)for(let p=0;p<4;p++)s.hands[p].push(s.stock.pop());
 do {const id=s.stock.pop();s.discard.push(id);if(card(id).wild||redThree(id))s.frozen=true;else break;} while(s.stock.length);
 for(let p=0;p<4;p++){
  for(let i=0;i<s.hands[p].length;i++)if(redThree(s.hands[p][i])){s.teams[teamOf(p)].reds.push(s.hands[p][i]);s.hands[p][i]=s.stock.pop();i--;}
 }
 s.turn=turnInfo(s);s.message=`Hand ${s.round}. ${NAMES[s.player]} to draw.`;s.log=[s.message];
}
function note(s,msg) {s.message=msg;s.log.push(msg);s.log=s.log.slice(-12);}
export function pileReason(s) {
 if(!s.discard.length)return 'The discard pile is empty.';
 const top=s.discard.at(-1);if(!natural(top))return 'A wild card or three blocks the pile.';
 if(s.hands[s.player].length===1&&s.discard.length===1)return 'With one card in hand, you cannot take a single-card pile.';
 const t=s.teams[teamOf(s.player)],r=card(top).rank,hand=s.hands[s.player],pairs=hand.filter(id=>card(id).rank===r);
 if(s.frozen||!Object.keys(t.melds).length)return pairs.length>=2?'':'You need two natural '+r+'s from your hand.';
 if(t.melds[r]||pairs.length>=2||pairs.length&&hand.some(id=>card(id).wild))return '';
 return 'You need a matching meld, a natural pair, or one matching card and a wild.';
}
export function forcedPickup(s) {const t=s.teams[teamOf(s.player)];return !s.stock.length&&!s.frozen&&s.discard.length>0&&natural(s.discard.at(-1))&&!!t.melds[card(s.discard.at(-1)).rank]&&!pileReason(s);}
function validateGroups(s,groups,taking) {
 check(Array.isArray(groups),'Choose cards for a meld.');
 const team=s.teams[teamOf(s.player)],melds=structuredClone(team.melds),hand=s.hands[s.player],used=[], ranks=new Set();
 const top=taking?s.discard.at(-1):null, topRank=taking?card(top).rank:null;
 if(taking)check(!pileReason(s),pileReason(s));
 const normalized=groups.map(g=>({rank:g.rank,ids:[...g.ids]}));
 if(taking&&!normalized.some(g=>g.rank===topRank))normalized.push({rank:topRank,ids:[]});
 check(normalized.length>0,'Stage at least one meld first.');
 for(const g of normalized){
  check((RANKS.includes(g.rank)||g.rank==='3')&&!ranks.has(g.rank),'Combine cards of one rank in a single draft.');ranks.add(g.rank);
  check(Array.isArray(g.ids)&&g.ids.every(id=>hand.includes(id)),'Those cards are no longer in your hand.');
  const added=[...g.ids];if(taking&&g.rank===topRank)added.push(top);
  check(added.length>0,'Choose a card to add.');used.push(...g.ids);
  if(taking&&g.rank===topRank){
   const pair=g.ids.filter(id=>card(id).rank===topRank).length;
   if(s.frozen||!Object.keys(team.melds).length)check(pair>=2,'The frozen pile needs two matching natural cards from your hand.');
   else if(!team.melds[topRank])check(pair>=2||(pair>=1&&g.ids.some(id=>card(id).wild)),'Meld the top discard using cards from your hand.');
  }
  const all=[...(melds[g.rank]||[]),...added];
  if(g.rank==='3')check(all.length>=3&&all.length<=4&&all.every(id=>card(id).rank==='3'&&!card(id).red),'Black threes need a group of three or four, with no wilds.');
  else check(all.length>=3&&all.filter(id=>card(id).rank===g.rank).length>=2&&all.filter(id=>card(id).wild).length<=3&&all.every(id=>card(id).rank===g.rank||card(id).wild),'A meld needs at least three cards, two matching natural cards, and at most three wilds.');
  melds[g.rank]=all;
 }
 check(new Set(used).size===used.length,'A card can only be used once.');
 const remaining=hand.length-used.length+(taking?s.discard.slice(0,-1).filter(id=>!redThree(id)).length:0),canasta=hasCanasta(melds);
 check(canasta||remaining>=2,'Keep two cards until your team has a canasta: one to keep and one to discard.');
 if(ranks.has('3'))check(canasta&&remaining<=1,'Black threes may only be melded when going out.');
 const points=value(used)+(taking?card(top).value:0),opening=!Object.keys(team.melds).length;
 const concealedException=!taking&&!s.turn.fromPile&&!s.turn.wasMelded&&remaining<=1&&canasta;
 check(!opening||points>=minimum(s.scores[teamOf(s.player)])||concealedException,`Your opening melds need ${minimum(s.scores[teamOf(s.player)])} points; these total ${points}.`);
 return {melds,used,remaining,points,ranks:[...ranks],mustOut:ranks.has('3')||(opening&&points<minimum(s.scores[teamOf(s.player)]))};
}
export function preview(s,groups,taking=false) {try{return {ok:true,...validateGroups(s,groups,taking)};}catch(e){return {ok:false,error:e.message};}}
function meld(s,groups,taking) {
 const team=s.teams[teamOf(s.player)],p=validateGroups(s,groups,taking);
 s.hands[s.player]=s.hands[s.player].filter(id=>!p.used.includes(id));team.melds=p.melds;
 s.turn.melded=true;s.turn.usedExisting ||= p.ranks.some(r=>s.turn.existing.includes(r));s.turn.mustOut ||= p.mustOut;
 if(taking){s.turn.fromPile=true;for(const id of s.discard.slice(0,-1)){if(redThree(id))team.reds.push(id);else s.hands[s.player].push(id);}s.discard=[];s.frozen=false;s.phase='meld';}
 note(s,`${NAMES[s.player]} ${taking?'took the discard pile and melded':'melded'} ${p.points} points.`);
 if(!s.hands[s.player].length)finish(s,s.player,'went out');
}
function finish(s,out,reason) {
 const rows=s.teams.map((t,i)=>{
  const meldPoints=value(Object.values(t.melds).flat()),canastas=Object.entries(t.melds).filter(([r,ids])=>r!=='3'&&ids.length>=7).reduce((n,[r,ids])=>n+(ids.some(id=>card(id).wild)?300:500),0);
  const redBonus=(t.reds.length===4?800:t.reds.length*100)*(Object.keys(t.melds).length?1:-1);
  const handPenalty=value(s.hands[i])+value(s.hands[i+2]);
  const concealed=out!==null&&teamOf(out)===i&&!s.turn.wasMelded&&!s.turn.usedExisting&&Object.entries(t.melds).some(([r,ids])=>!s.turn.existing.includes(r)&&r!=='3'&&ids.length>=7);
  const outBonus=out!==null&&teamOf(out)===i?(concealed?200:100):0;
  return {meldPoints,canastas,redBonus,handPenalty,outBonus,total:meldPoints+canastas+redBonus+outBonus-handPenalty};
 });
 s.scores=s.scores.map((n,i)=>n+rows[i].total);s.result={rows,out,reason,round:s.round,scores:[...s.scores]};s.history.push(s.result);
 const over=Math.max(...s.scores)>=5000&&s.scores[0]!==s.scores[1];s.phase=over?'matchOver':'roundOver';note(s,out===null?reason:`${NAMES[out]} went out.`);
}
export function act(state,action) {
 const s=structuredClone(state);s.serial++;
 if(action.type==='next') {check(s.phase==='roundOver','Finish this hand first.');s.round++;s.dealer=(s.dealer+1)%4;deal(s);return s;}
 check(['draw','meld'].includes(s.phase),'This hand is finished.');
 if(action.type==='draw'){
  check(s.phase==='draw','You have already drawn.');
  if(!s.stock.length){check(!forcedPickup(s),'With the stock empty, you must take the matching discard.');finish(s,null,'The stock is empty.');return s;}
  let id=s.stock.pop();while(redThree(id)){s.teams[teamOf(s.player)].reds.push(id);if(!s.stock.length){finish(s,null,'The last stock card was a red three.');return s;}id=s.stock.pop();}
  s.hands[s.player].push(id);s.phase='meld';note(s,`${NAMES[s.player]} drew a card. Meld, or select a card to discard.`);
 } else if(action.type==='take') {check(s.phase==='draw','Take the pile instead of drawing.');meld(s,action.groups||[],true);}
 else if(action.type==='meld'){check(s.phase==='meld','Draw a card first.');check(!s.turn.mustOut,'Discard your last card to go out.');meld(s,action.groups,false);}
 else if(action.type==='discard'){
  check(s.phase==='meld','Draw a card first.');const h=s.hands[s.player];check(h.includes(action.id),'Select one card from your hand.');check(h.length>1||hasCanasta(s.teams[teamOf(s.player)].melds),'Your team needs a canasta before going out.');
  h.splice(h.indexOf(action.id),1);s.discard.push(action.id);if(card(action.id).wild)s.frozen=true;
  if(!h.length)finish(s,s.player,'went out');else {const who=s.player,c=card(action.id);s.everMelded[who] ||= s.turn.melded;s.player=(s.player+1)%4;s.phase='draw';s.turn=turnInfo(s);note(s,`${NAMES[who]} discarded ${c.rank}${c.suit}. ${NAMES[s.player]} to draw.`);}
 }else throw Error('Unknown action.');return s;
}
// Bot choices inspect only their own hand, public melds/pile, and stock count.
export function planMelds(s,taking=false) {
 const hand=[...s.hands[s.player]],t=s.teams[teamOf(s.player)],groups=[];let remaining=[...hand];
 if(taking){if(pileReason(s))return null;const rank=card(s.discard.at(-1)).rank,pair=remaining.filter(id=>card(id).rank===rank);
  let ids=[];if(s.frozen||!Object.keys(t.melds).length||!t.melds[rank]){ids=pair.slice(0,2);if(ids.length<2){const wild=remaining.find(id=>card(id).wild);if(wild!==undefined)ids.push(wild);}}
  groups.push({rank,ids});remaining=remaining.filter(id=>!ids.includes(id));
 }
 for(const rank of RANKS){
  const ids=remaining.filter(id=>card(id).rank===rank),g=groups.find(g=>g.rank===rank),existing=t.melds[rank]||[];
  if(g){g.ids.push(...ids);remaining=remaining.filter(id=>!ids.includes(id));continue;}
  if(existing.length&&ids.length||ids.length>=2){
   const need=existing.length?0:Math.max(0,3-ids.length),wilds=remaining.filter(id=>card(id).wild).slice(0,need);
   if(wilds.length===need){groups.push({rank,ids:[...ids,...wilds]});remaining=remaining.filter(id=>![...ids,...wilds].includes(id));}
  }
 }
 // Spend spare wilds to finish canastas or reach the opening threshold.
 for(const id of [...remaining].filter(id=>card(id).wild)){
  const targets=groups.filter(g=>g.rank!=='3'&&[...(t.melds[g.rank]||[]),...g.ids].filter(x=>card(x).wild).length<3).sort((a,b)=>(t.melds[b.rank]?.length||0)+b.ids.length-((t.melds[a.rank]?.length||0)+a.ids.length));
  if(targets.length){targets[0].ids.push(id);remaining=remaining.filter(x=>x!==id);}
 }
 if(hasCanasta(t.melds)||groups.some(g=>(t.melds[g.rank]?.length||0)+g.ids.length+(taking&&g.rank===card(s.discard.at(-1)).rank?1:0)>=7)){
  const blacks=remaining.filter(id=>card(id).rank==='3');if(blacks.length>=3&&remaining.length-blacks.length<=1)groups.push({rank:'3',ids:blacks});
 }
 // Reserve discard/held cards where needed; retry without low-value groups.
 for(let tries=0;tries<40;tries++){
  if(preview(s,groups,taking).ok)return groups;
  let changed=false;
  for(const g of [...groups].reverse()){
   const top=taking&&g.rank===card(s.discard.at(-1)).rank;
   const base=t.melds[g.rank]?.length||0;
   if(g.ids.length+base+(top?1:0)>3&&g.ids.length>(top&&(s.frozen||!Object.keys(t.melds).length)?2:0)) {g.ids.pop();changed=true;break;}
  }
  if(!changed){const i=groups.findLastIndex(g=>!taking||g.rank!==card(s.discard.at(-1)).rank);if(i<0)return null;groups.splice(i,1);}
  if(!groups.length)return null;
 }
 return null;
}
export function botAction(s) {
 if(s.phase==='draw'){const groups=planMelds(s,true);if(groups&&s.discard.length>0)return {type:'take',groups};return {type:'draw'};}
 if(s.phase!=='meld')return null;
 if(!s.turn.mustOut){const groups=planMelds(s);if(groups?.length)return {type:'meld',groups};}
 const h=s.hands[s.player],t=s.teams[teamOf(s.player)],op=s.teams[1-teamOf(s.player)];
 const cost=id=>{const c=card(id);return c.rank==='3'?-100:(c.wild?150:0)+(t.melds[c.rank]?35:0)+h.filter(x=>card(x).rank===c.rank).length*15+(op.melds[c.rank]?40:0)+c.value;};
 return {type:'discard',id:[...h].sort((a,b)=>cost(a)-cost(b)||a-b)[0]};
}
export function validate(s) {
 try {
  check(s.version===1&&Number.isInteger(s.seed)&&s.round>=1&&s.player>=0&&s.player<4,'Invalid save.');
  check(['draw','meld','roundOver','matchOver'].includes(s.phase)&&s.hands.length===4&&s.teams.length===2,'Invalid save.');
  const all=[...s.stock,...s.discard,...s.hands.flat(),...s.teams.flatMap(t=>[...t.reds,...Object.values(t.melds).flat()])];check(all.length===108&&new Set(all).size===108,'Invalid deck.');all.forEach(card);
  check(s.scores.length===2&&s.scores.every(Number.isFinite),'Invalid scores.');
  check(s.teams.every(t=>t.reds.every(redThree))&&s.hands.every(h=>h.every(id=>!redThree(id))),'Invalid red threes.');
  return true;
 }catch{return false;}
}
// Replay is the save authority, so malformed states cannot invent cards or scores.
export function restore(record) {
 check(record?.version===1&&Number.isInteger(record.seed)&&Array.isArray(record.actions)&&record.actions.length<50000,'Saved match could not be read.');
 let s=newGame(record.seed);for(const a of record.actions)s=act(s,a);return s;
}
