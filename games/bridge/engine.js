'use strict';
const Bridge = (() => {
  const SUITS=['S','H','C','D'],STRAINS=['C','D','H','S','N'],RANKS=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const deck=()=>SUITS.flatMap(s=>RANKS.map(r=>r+s));
  const card=id=>({rank:id.slice(0,-1),suit:id.slice(-1)});
  const strength=id=>RANKS.indexOf(card(id).rank)+2;
  const hcp=hand=>hand.reduce((n,c)=>n+Math.max(0,strength(c)-10),0);
  const team=p=>p%2,partner=p=>(p+2)%4,next=p=>(p+1)%4;
  function shuffled(random=Math.random){const d=deck();for(let i=51;i>0;i--){const j=Math.floor(random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}return d;}
  function validDeck(d){return Array.isArray(d)&&d.length===52&&new Set(d).size===52&&d.every(c=>deck().includes(c));}
  function vulnerability(board){return [[false,false],[true,false],[false,true],[true,true],[true,false],[false,true],[true,true],[false,false],[false,true],[true,true],[false,false],[true,false],[true,true],[false,false],[true,false],[false,true]][(board-1)%16];}
  function deal(d,board,total,history){if(!validDeck(d))throw Error('Invalid deck');const dealer=(board+1)%4,hands=[[],[],[],[]];d.forEach((c,i)=>hands[(dealer+1+i)%4].push(c));return {phase:'auction',board,total,dealer,turn:dealer,hands,auction:[],contract:null,passes:0,dummyOpen:false,trick:[],completed:[],taken:[0,0],history,net:history.reduce((n,r)=>n+r.ns,0),result:null,vulnerable:vulnerability(board)};}
  function start({deck:d,boards=4}){if(![4,8,16].includes(boards))throw Error('Invalid session length');return deal(d,1,boards,[]);}
  const bidValue=c=>(c.level-1)*5+STRAINS.indexOf(c.strain);
  function legalCalls(s){if(s.phase!=='auction')return [];const calls=[{type:'call',call:'pass'}];const c=s.contract;
    for(let level=1;level<=7;level++)for(const strain of STRAINS)if(!c||bidValue({level,strain})>bidValue(c))calls.push({type:'call',call:'bid',level,strain});
    if(c&&team(s.turn)!==team(c.bidder)&&c.double===1)calls.push({type:'call',call:'double'});
    if(c&&team(s.turn)===team(c.bidder)&&c.double===2)calls.push({type:'call',call:'redouble'});
    return calls;
  }
  const sameCall=(a,b)=>a.call===b.call&&(a.call!=='bid'||a.level===b.level&&a.strain===b.strain);
  function legalCards(hand,trick){if(!trick.length)return [...hand];const suit=card(trick[0].card).suit,follow=hand.filter(c=>card(c).suit===suit);return follow.length?follow:[...hand];}
  function winningPlay(trick,trump){const lead=card(trick[0].card).suit;const value=c=>strength(c)+(card(c).suit===trump?100:card(c).suit===lead?50:0);return trick.reduce((a,b)=>value(b.card)>value(a.card)?b:a);}
  function scoreContract(c,tricks,vulnerable){
    const target=c.level+6,delta=tricks-target,m=c.double;
    if(delta<0){const down=-delta;let penalty;if(m===1)penalty=down*(vulnerable?100:50);else{penalty=vulnerable?200+300*(down-1):100+200*Math.min(2,down-1)+300*Math.max(0,down-3);if(m===4)penalty*=2;}return {points:-penalty,contractPoints:0,bonus:0,overtricks:0,penalty,delta};}
    const rate=['C','D'].includes(c.strain)?20:30,base=(c.level*rate+(c.strain==='N'?10:0))*m;
    const gameBonus=base>=100?(vulnerable?500:300):50,slam=c.level===6?(vulnerable?750:500):c.level===7?(vulnerable?1500:1000):0,insult=m===2?50:m===4?100:0;
    const overtricks=delta*(m===1?rate:(vulnerable?200:100)*(m===4?2:1));
    return {points:base+gameBonus+slam+insult+overtricks,contractPoints:base,bonus:gameBonus+slam+insult,overtricks,penalty:0,delta};
  }
  function finish(s,passed=false){const c=s.contract,r=passed?{points:0,contractPoints:0,bonus:0,overtricks:0,penalty:0,delta:0}:scoreContract(c,s.taken[team(c.declarer)],s.vulnerable[team(c.declarer)]);s.result={...r,board:s.board,passed,contract:c?{...c}:null,tricks:passed?0:s.taken[team(c.declarer)],ns:passed?0:r.points*(team(c.declarer)===0?1:-1)};s.history.push(s.result);s.net+=s.result.ns;s.phase=s.board===s.total?'sessionOver':'boardOver';}
  function step(state,action){const s=structuredClone(state);if(!action||typeof action!=='object')throw Error('Invalid action');
    if(action.type==='call'&&s.phase==='auction'){
      if(!legalCalls(s).some(a=>sameCall(a,action)))throw Error('That call is not available');
      const p=s.turn;s.auction.push({player:p,...(action.call==='bid'?{call:'bid',level:action.level,strain:action.strain}:{call:action.call})});
      if(action.call==='pass')s.passes++;else{s.passes=0;if(action.call==='bid')s.contract={level:action.level,strain:action.strain,bidder:p,double:1};else s.contract.double=action.call==='double'?2:4;}
      s.turn=next(p);
      if(!s.contract&&s.passes===4)finish(s,true);
      else if(s.contract&&s.passes===3){const c=s.contract;c.declarer=s.auction.find(a=>a.call==='bid'&&a.strain===c.strain&&team(a.player)===team(c.bidder)).player;c.dummy=partner(c.declarer);s.turn=next(c.declarer);s.phase='play';}
    }else if(action.type==='play'&&s.phase==='play'){
      if(!legalCards(s.hands[s.turn],s.trick).includes(action.card))throw Error('Follow the suit led when you can');
      s.hands[s.turn].splice(s.hands[s.turn].indexOf(action.card),1);s.trick.push({player:s.turn,card:action.card});s.dummyOpen=true;
      if(s.trick.length===4){s.turn=winningPlay(s.trick,s.contract.strain).player;s.phase='trick';}else s.turn=next(s.turn);
    }else if(action.type==='collect'&&s.phase==='trick'){
      s.taken[team(s.turn)]++;s.completed.push({plays:s.trick,winner:s.turn});s.trick=[];
      if(s.completed.length===13)finish(s);else s.phase='play';
    }else if(action.type==='nextBoard'&&s.phase==='boardOver')return deal(action.deck,s.board+1,s.total,s.history);
    else throw Error('That action does not fit this turn');return s;
  }
  function restore(record){if(!record||record.version!==1||!record.initial||!Array.isArray(record.actions)||record.actions.length>5000)throw Error('Invalid save');let s=start(record.initial);for(const a of record.actions)s=step(s,a);return s;}
  function humanTurn(s){return s.phase==='auction'?s.turn===0:s.phase==='play'&&(s.turn===0||(s.dummyOpen&&s.contract.declarer%2===0&&s.turn===2));}
  // Only the controller's hand and a revealed dummy cross the bot boundary.
  function viewFor(s,p){const controller=s.dummyOpen&&s.contract&&p===s.contract.dummy?s.contract.declarer:p;return {phase:s.phase,player:p,controller,hand:[...s.hands[p]],ownHand:[...s.hands[controller]],dummy:s.dummyOpen?{player:s.contract.dummy,hand:[...s.hands[s.contract.dummy]]}:null,auction:structuredClone(s.auction),contract:s.contract?{...s.contract}:null,trick:structuredClone(s.trick),completed:structuredClone(s.completed),legal:s.phase==='auction'?legalCalls(s):s.phase==='play'?legalCards(s.hands[p],s.trick):[],vulnerable:[...s.vulnerable]};}
  function chooseAction(v){
    if(v.phase==='auction'){
      const pass={type:'call',call:'pass'},points=hcp(v.hand),counts=Object.fromEntries(STRAINS.slice(0,4).map(s=>[s,v.hand.filter(c=>card(c).suit===s).length])),balanced=Object.values(counts).every(n=>n>=2&&n<=5);
      const own=v.auction.filter(a=>a.player===v.player&&a.call==='bid'),pb=v.auction.filter(a=>a.player===partner(v.player)&&a.call==='bid').at(-1),last=v.contract;
      let level=1,strain=['S','H'].filter(s=>counts[s]>=5).sort((a,b)=>counts[b]-counts[a])[0]||(['D','C'].sort((a,b)=>counts[b]-counts[a]||STRAINS.indexOf(a)-STRAINS.indexOf(b))[0]);
      if(own.length>=2)return pass;
      if(!last){if(points<12)return pass;if(balanced&&points>=15&&points<=17){strain='N';level=1;}else if(balanced&&points>=20){strain='N';level=2;}}
      else if(pb&&team(last.bidder)===team(v.player)){
        if(own.length){if(own.at(-1).strain===pb.strain||points<16)return pass;if(pb.strain==='N'){if(points<18)return pass;strain='N';level=3;}else if(counts[pb.strain]>=4){strain=pb.strain;level=['S','H'].includes(strain)?4:3;}else return pass;}
        else if(pb.strain==='N'){if(points<8)return pass;strain='N';level=points>=10?3:2;}
        else if(counts[pb.strain]>=(['S','H'].includes(pb.strain)?3:5)){if(points<6)return pass;strain=pb.strain;level=points>=13?(['S','H'].includes(strain)?4:3):points>=10?3:2;}
        else{if(points<6)return pass;if(balanced){strain='N';level=points>=13?3:points>=10?2:1;}else if(points<10&&bidValue({level:1,strain})<=bidValue(last))return pass;}
      }else{if(points<13||counts[strain]<5||own.length)return pass;}
      const candidate=v.legal.find(a=>a.call==='bid'&&a.strain===strain&&a.level>=level);if(!candidate||candidate.level>Math.max(level,2))return pass;return candidate;
    }
    if(v.phase==='play'){
      const legal=[...v.legal].sort((a,b)=>strength(a)-strength(b)),trump=v.contract.strain;
      if(!v.trick.length){const ace=legal.find(c=>strength(c)===14);if(ace)return {type:'play',card:ace};const counts={};for(const c of legal)counts[card(c).suit]=(counts[card(c).suit]||0)+1;legal.sort((a,b)=>counts[card(b).suit]-counts[card(a).suit]||strength(a)-strength(b));return {type:'play',card:legal[0]};}
      const winner=winningPlay(v.trick,trump);if(team(winner.player)===team(v.player))return {type:'play',card:legal[0]};
      const winners=legal.filter(c=>winningPlay([...v.trick,{player:v.player,card:c}],trump).player===v.player);return {type:'play',card:winners[0]||legal[0]};
    }
    throw Error('Computer has no action');
  }
  return {SUITS,STRAINS,RANKS,deck,card,strength,hcp,team,partner,shuffled,validDeck,vulnerability,start,legalCalls,sameCall,bidValue,legalCards,winningPlay,scoreContract,step,restore,humanTurn,viewFor,chooseAction};
})();
if(typeof module!=='undefined')module.exports=Bridge;
