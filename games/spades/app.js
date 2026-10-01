'use strict';
(() => {
  const E=Spades,KEY='ai-spades-game-v1',SETTINGS='ai-spades-settings-v1';
  const names=['You','West','Partner','East'],suits={S:'Spades',H:'Hearts',C:'Clubs',D:'Diamonds'},symbols={S:'♠',H:'♥',C:'♣',D:'♦'},ranks={J:'Jack',Q:'Queen',K:'King',A:'Ace'};
  const $=id=>document.getElementById(id),panel=$('panel');
  let settings={pace:'relaxed',target:500};
  try{const saved=JSON.parse(localStorage.getItem(SETTINGS));if(saved)settings={pace:saved.pace==='steady'?'steady':'relaxed',target:saved.target===250?250:500};}catch{}
  let record,state,lastSaved=null,selection={card:null,bid:null},timer,generation=0,dialogKind='',opener=null,storageWarning='',offlineReady=false,primaryUntil=0;
  const held=new Set();
  const cardName=id=>`${ranks[E.card(id).rank]||E.card(id).rank} of ${suits[E.card(id).suit]}`;
  const shortCard=id=>E.card(id).rank+symbols[E.card(id).suit];
  const face=id=>cardSVG(E.card(id).rank,E.card(id).suit);
  const signed=n=>n>0?'+'+n:String(n);
  function load(){
    let damaged=false;
    for(const key of [KEY,KEY+'-backup'])try{
      const raw=localStorage.getItem(key);if(!raw)continue;const data=JSON.parse(raw),game=E.restore(data);record=data;state=game;lastSaved=raw;
      if(data.selection&&typeof data.selection==='object')selection={card:state.hands[0].includes(data.selection.card)?data.selection.card:null,bid:Number.isInteger(data.selection.bid)&&data.selection.bid>=0&&data.selection.bid<=13?data.selection.bid:null};
      if(key!==KEY)storageWarning='Recovered the previous saved position.';return;
    }catch{damaged=true;}
    if(damaged)storageWarning='The saved match could not be read. A new match is ready.';newMatch(false);
  }
  function save(){
    record.selection={...selection};
    try{const data=JSON.stringify(record);if(lastSaved)localStorage.setItem(KEY+'-backup',lastSaved);localStorage.setItem(KEY,data);lastSaved=data;}
    catch{storageWarning='This browser cannot save progress. Keep this tab open to finish your match.';}
  }
  function newMatch(draw=true){if(state)primaryUntil=performance.now()+500;const initial={deck:E.shuffled(),dealer:3,target:settings.target};record={version:1,initial,actions:[]};state=E.start(initial);selection={card:null,bid:null};save();if(draw)render();}
  function commit(action){try{const next=E.step(state,action);record.actions.push(action);state=next;selection={card:null,bid:null};if(storageWarning==='Recovered the previous saved position.')storageWarning='';save();render();}catch(error){storageWarning=error.message;render();}}
  function humanTurn(){return ['bid','play'].includes(state.phase)&&state.turn===0;}
  function schedule(){clearTimeout(timer);if(document.hidden||panel.open||held.size||!['bid','play'].includes(state.phase)||state.turn===0)return;const stamp=generation;timer=setTimeout(()=>{if(stamp===generation&&!document.hidden&&!panel.open&&!held.size)commit(E.chooseAction(E.viewFor(state,state.turn)));},settings.pace==='steady'?750:1400);}
  function contract(team){return state.bids[team]===null||state.bids[team+2]===null?null:state.bids[team]+state.bids[team+2];}
  function liveTaken(){const taken=[...state.taken];if(state.phase==='trick')taken[state.turn]++;return taken;}
  function teamTaken(team,taken=liveTaken()){return [team,team+2].filter(p=>state.bids[p]!==0).reduce((n,p)=>n+taken[p],0);}
  function statusText(){
    if(state.phase==='bid'){
      if(state.turn!==0)return [`${names[state.turn]} is bidding…`,'Each player bids once. Partners combine their bids.'];
      return ['How many tricks can you take?',selection.bid===0?'Nil: take no tricks. Success +100; failure −100.':`Your partner ${state.bids[2]===null?'has not bid yet':state.bids[2]===0?'bid Nil':'bid '+state.bids[2]+'.'}`];
    }
    if(state.phase==='play'){
      if(state.turn!==0)return [`${names[state.turn]} is playing…`,state.bids[2]===0&&state.taken[2]===0?'Your partner bid Nil. Help them avoid tricks.':`Trick ${state.completed.length+1} of 13. Spades are always trump.`];
      if(selection.card)return ['Your turn',cardName(selection.card)];
      const led=state.trick.length?E.card(state.trick[0].card).suit:null,must=led&&state.hands[0].some(id=>E.card(id).suit===led);
      if(led)return ['Your turn',must?`Follow ${suits[led]}. Choose a card, then play.`:'You have none of the led suit. Play any card.'];
      return ['You lead',!state.broken&&state.hands[0].some(id=>E.card(id).suit!=='S')?'Spades are not broken. Lead another suit.':'Choose a card, then confirm.'];
    }
    if(state.phase==='trick')return [`${names[state.turn]} ${state.turn===0?'win':'wins'} the trick`,state.bids[state.turn]===0?`${state.turn===0?'Your Nil':names[state.turn]+"'s Nil"} ${state.taken[state.turn]===0?'is now broken':'has failed'}.`:`${shortCard(E.winningPlay(state.trick).card)} wins. Review the cards, then continue.`];
    if(state.phase==='matchOver')return [state.winner===0?'Your team wins!':'West + East win',`Final score: ${state.score[0]} to ${state.score[1]}.`];
    return ['Hand complete',Math.max(...state.score)>=state.target&&state.score[0]===state.score[1]?'Tied at the target. Play another hand.':`Your team ${signed(state.result[0].total)} · West + East ${signed(state.result[1].total)}`];
  }
  function scoreMarkup(){return `<div class="score-lines">${state.result.map(r=>`<section><h3>${r.team===0?'You + Partner':'West + East'} <strong>${signed(r.total)}</strong></h3><p>${r.bid?`${r.taken} of ${r.bid} bid: ${signed(r.contractPoints)}`:'No numbered contract'}${r.nils.map(n=>`<br>${names[n.player]}: Nil ${n.success?'made':'failed'} ${signed(n.points)}`).join('')}<br>${r.bagsEarned} new ${r.bagsEarned===1?'bag':'bags'}: ${signed(r.bagsEarned)}${r.bagPenalty?`<br>Bag penalty: −${r.bagPenalty}`:''}<br>${r.bags} bags carried forward</p></section>`).join('')}</div>`;}
  function render(){
    generation++;
    const canSelect=state.phase==='play'&&state.turn===0,legal=canSelect?E.legalCards(state.hands[0],state.trick,state.broken):[];
    if(!legal.includes(selection.card))selection.card=null;
    if(state.phase==='bid'&&state.turn===0){if(!Number.isInteger(selection.bid)||selection.bid<0||selection.bid>13)selection.bid=3;}else selection.bid=null;
    const focused=document.activeElement,focusId=focused?.id,focusCard=focused?.dataset?.card;
    $('us-score').textContent=state.score[0];$('them-score').textContent=state.score[1];$('target-score').textContent=state.target;
    $('us-bags').textContent=`${state.bags[0]} bags`;$('them-bags').textContent=`${state.bags[1]} bags`;
    $('us-bags').classList.toggle('bag-warning',state.bags[0]>=8);$('them-bags').classList.toggle('bag-warning',state.bags[1]>=8);
    $('trump').textContent=state.broken?'♠ Spades are broken':'♠ Spades not broken';$('contract').textContent=`Hand ${state.handNumber} · ${state.completed.length}/13 tricks`;
    const taken=liveTaken();
    $('tricks').textContent=state.phase==='bid'?`Bids: us ${contract(0)??'—'} · them ${contract(1)??'—'}`:`Contract: us ${teamTaken(0,taken)}/${contract(0)} · them ${teamTaken(1,taken)}/${contract(1)}`;
    $('last-trick').disabled=!state.completed.length;
    for(let p=0;p<4;p++){
      const seat=$('seat-'+p),active=['bid','play'].includes(state.phase)&&state.turn===p,nil=state.bids[p]===0;
      seat.className=`seat ${['south','west','north','east'][p]}${active?' active':''}${nil?' nil-seat':''}${nil&&taken[p]>0?' nil-failed':''}`;
      seat.innerHTML=`<b>${names[p]}${p===state.dealer?' <span class="dealer-mark" aria-label="dealer">D</span>':''}</b><small>${state.bids[p]===null?'Bid —':nil?`Nil ${taken[p]?'failed · '+taken[p]:'· no tricks'}`:`${taken[p]} taken · bid ${state.bids[p]}`}</small>`;
    }
    $('table').classList.toggle('bidding',state.phase==='bid');const center=$('table-center');
    if(state.trick.length)center.innerHTML=state.trick.map(p=>`<div class="played p${p.player}${state.phase==='trick'&&p.player===state.turn?' winner':''}" role="img" aria-label="${names[p.player]}: ${cardName(p.card)}${state.phase==='trick'&&p.player===state.turn?', winner':''}">${face(p.card)}</div>`).join('');
    else if(['handOver','matchOver'].includes(state.phase))center.innerHTML=`<div class="table-message"><span>${state.phase==='matchOver'?'Final score':'Match score'}</span><strong>${state.score[0]} — ${state.score[1]}</strong><span>You + Partner · West + East</span></div>`;
    else center.innerHTML=`<div class="table-message"><strong>♠</strong><span>${state.phase==='bid'?'Make your bid':'Spades are trump'}</span><span class="bowers">${state.phase==='bid'?'':state.broken?'Any suit may be led.':'Lead another suit until broken.'}</span></div>`;
    const sorted=[...state.hands[0]].sort((a,b)=>E.SUITS.indexOf(E.card(a).suit)-E.SUITS.indexOf(E.card(b).suit)||E.strength(b)-E.strength(a));
    const split=sorted.length>7?Math.ceil(sorted.length/2):sorted.length,rows=sorted.length?[sorted.slice(0,split),sorted.slice(split)].filter(r=>r.length):[];
    $('hand').innerHTML=rows.map(row=>`<div class="hand-row">${row.map(id=>`<button type="button" class="card${canSelect&&!legal.includes(id)?' unplayable':''}" data-card="${id}" aria-label="${cardName(id)}${canSelect&&!legal.includes(id)?'; unavailable this turn':''}" aria-pressed="${selection.card===id}" ${legal.includes(id)?'':'disabled'}>${face(id)}</button>`).join('')}</div>`).join('')||'<p class="bowers">All thirteen cards played</p>';
    $('hand-note').textContent=state.bids[0]===0?(taken[0]?'Nil failed · keep playing':'Nil · avoid every trick'):canSelect?'Choose, then confirm':`${sorted.length} cards · your partner is opposite`;
    document.querySelector('.player-zone').classList.toggle('live-turn',humanTurn());
    const [instruction,detail]=statusText();$('instruction').textContent=instruction;$('detail').textContent=detail;
    $('bid-controls').hidden=state.phase!=='bid'||state.turn!==0;
    if(!$('bid-controls').hidden){$('bid-value').textContent=selection.bid===0?'Nil':selection.bid;$('bid-down').disabled=selection.bid<=1;$('bid-up').disabled=selection.bid>=13;$('bid-nil').setAttribute('aria-pressed',String(selection.bid===0));}
    const score=$('score-detail');score.hidden=!['handOver','matchOver'].includes(state.phase);score.innerHTML=score.hidden?'':scoreMarkup();
    const primary=$('primary-action');primary.disabled=false;
    if(state.phase==='bid'&&state.turn===0)primary.textContent=selection.bid===0?'Confirm Nil · no tricks':`Bid ${selection.bid} ${selection.bid===1?'trick':'tricks'}`;
    else if(canSelect){primary.disabled=!selection.card;primary.textContent=selection.card?`Play ${shortCard(selection.card)}`:'Choose a card to play';}
    else if(state.phase==='trick')primary.textContent=state.completed.length===12?'See hand score':'Next trick';
    else if(state.phase==='handOver')primary.textContent='Deal next hand';
    else if(state.phase==='matchOver')primary.textContent='Play again';
    else{primary.textContent='Waiting for '+names[state.turn];primary.disabled=true;}
    $('storage-note').textContent=storageWarning;
    if(!panel.open){const target=focusCard?document.querySelector(`[data-card="${focusCard}"]`):focusId?$(focusId):null;if(target&&!target.disabled)target.focus({preventScroll:true});}schedule();
  }
  $('hand').addEventListener('click',event=>{const b=event.target.closest('[data-card]');if(!b||b.disabled)return;selection.card=selection.card===b.dataset.card?null:b.dataset.card;save();render();});
  function setBid(bid){if(state.phase!=='bid'||state.turn!==0)return;selection.bid=Math.max(0,Math.min(13,bid));save();render();}
  $('bid-down').addEventListener('click',()=>setBid(selection.bid-1));$('bid-up').addEventListener('click',()=>setBid(selection.bid+1));$('bid-nil').addEventListener('click',()=>setBid(selection.bid===0?3:0));
  // A repeated activation must not accept the button's next meaning.
  $('primary-action').addEventListener('keydown',event=>{if(event.repeat&&['Enter',' '].includes(event.key))event.preventDefault();});
  $('primary-action').addEventListener('click',event=>{if(panel.open||event.detail>1||performance.now()<primaryUntil)return;primaryUntil=performance.now()+500;if(state.phase==='bid'&&state.turn===0)commit({type:'bid',bid:selection.bid});else if(state.phase==='play'&&state.turn===0&&selection.card)commit({type:'play',card:selection.card});else if(state.phase==='trick')commit({type:'collect'});else if(state.phase==='handOver')commit({type:'nextHand',deck:E.shuffled()});else if(state.phase==='matchOver')newMatch();});
  const help=`<div class="help-text"><h3>Bid, then play as a team</h3><p>You and Partner play against West and East. Everyone gets 13 cards from a standard 52-card deck. Aces are high; twos are low. Spades are always trump. This version has no jokers or card passing.</p><p>Starting to the dealer's left, each player bids how many tricks they expect to take. Partners combine their numbered bids. Everyone bids once; there is no passing or second bidding round.</p><h3>Make a deliberate choice</h3><p>Use − and + to choose 1–13 tricks, or choose Nil. Confirm the bid with the gold button. During play, tap a card and use Play to confirm. Change your selection before committing. Darkened cards cannot be played on this turn.</p><h3>Follow suit and break spades</h3><p>The first player to the dealer's left leads. Play the suit led if you have it. If you are out of that suit, play any card, including a spade on the first trick. Highest spade wins; otherwise the highest card of the led suit wins. The winner leads next.</p><p>You cannot lead a spade until someone has played one, unless your hand contains only spades. Playing that first spade “breaks” spades. The table keeps this state visible.</p><h3>Make your team's bid</h3><p>If your team makes its combined numbered bid, score 10 points per trick bid plus 1 for each extra trick. Extras are bags. If your team falls short, lose 10 points per trick bid. For example, bid 5 and take 7: +52 points and 2 bags. Bid 5 and take 4: −50 points.</p><h3>Watch the bags</h3><p>Every 10 accumulated bags cost 100 points. Extra bags carry forward. If you have 8 bags and earn 4 more, lose 100 points and keep 2 bags. Bags are counted separately from the score.</p><h3>Nil is a separate promise</h3><p>Nil means taking no tricks yourself. Success earns your team 100 points; taking any trick costs 100. Your partner's numbered bid is scored separately.</p><p>In this version, tricks taken by a failed Nil bidder do not help make the partner's bid. Each instead adds a bag and 1 bag point, even when the partner's contract fails. Both partners may bid Nil; each is scored independently. There is no blind Nil or special double-Nil bonus.</p><h3>Finish the match</h3><p>All 13 tricks are played before scoring both teams. The target is 500 points, with an optional 250-point match in Settings. If both teams reach the target together, the higher total wins. A tie continues to another hand. There is no early loss for a negative score.</p><h3>Save, pause and play offline</h3><p>Every action saves on this browser. Menu pauses computer play. Each finished trick waits for you to continue. Load once online to prepare an offline copy; Safari's Share → Add to Home Screen keeps the game handy. Clearing website data removes saved matches.</p><p>Rules references: <a href="https://www.pagat.com/auctionwhist/spades.html" target="_blank" rel="noopener">Pagat's partnership Spades</a> and <a href="https://bicyclecards.com/how-to-play/spades/" target="_blank" rel="noopener">Bicycle</a>. The choices above define this game's house rules.</p></div>`;
  function openPanel(kind,trigger=null){
    if(!panel.open)opener=trigger||document.activeElement;clearTimeout(timer);dialogKind=kind;generation++;const body=$('panel-body');
    if(kind==='menu'){$('panel-title').textContent='At the table';body.innerHTML=`<div class="menu-list"><button data-panel="help">How to play <span>›</span></button><button data-panel="settings">Settings <span>›</span></button><button data-panel="bidding">Bids this hand <span>›</span></button><button data-panel="new">New match <span>›</span></button></div><p class="bowers">${offlineReady?'Ready to play offline.':'Offline copy prepares after loading online.'} Progress saves on this browser.</p>`;}
    else if(kind==='help'){$('panel-title').textContent='How to play';body.innerHTML=help;}
    else if(kind==='settings'){$('panel-title').textContent='Settings';body.innerHTML=`<label class="setting"><span>Computer pace</span><select id="pace"><option value="relaxed">Relaxed</option><option value="steady">Steady</option></select><small>Every completed trick waits for you.</small></label><label class="setting"><span>Match target</span><select id="target"><option value="500">500 points · standard</option><option value="250">250 points · shorter</option></select><small>Applies to the next match. This match: ${state.target}.</small></label><button id="save-settings" class="primary">Save settings</button>`;$('pace').value=settings.pace;$('target').value=String(settings.target);}
    else if(kind==='new'){$('panel-title').textContent='Start a new match?';body.innerHTML='<p>This replaces the saved match and resets both scores and bags.</p><button id="new-match" class="primary">Start new match</button><button id="keep-playing" class="primary quiet">Keep playing</button>';}
    else if(kind==='bidding'){$('panel-title').textContent='Bids this hand';body.innerHTML=`<p>Dealer: ${names[state.dealer]}. Partners combine numbered bids.</p><ul class="bid-log">${state.bids.map((b,p)=>`<li>${names[p]}: ${b===null?'not bid yet':b===0?`Nil · ${liveTaken()[p]?'failed':'no tricks so far'}`:`bid ${b} · ${liveTaken()[p]} taken`}</li>`).join('')}</ul><p>Team contracts: us ${contract(0)??'—'} · them ${contract(1)??'—'}</p>`;}
    else if(kind==='last'){const last=state.completed.at(-1);if(!last)return;$('panel-title').textContent=`${names[last.winner]} won the last trick`;body.innerHTML=`<p>♠ Spades are always trump.</p><div class="last-grid">${last.plays.map(p=>`<div>${names[p.player]}<div role="img" aria-label="${cardName(p.card)}">${face(p.card)}</div>${p.player===last.winner?'<small>Winner</small>':''}</div>`).join('')}</div>`;}
    body.scrollTop=0;if(!panel.open)panel.showModal();$('close-panel').focus({preventScroll:true});
  }
  function resumeFromPanel(){if(!dialogKind)return;dialogKind='';generation++;render();if(opener?.matches('button')&&opener.isConnected&&!opener.disabled)opener.focus({preventScroll:true});else $('menu-button').focus({preventScroll:true});}
  function closePanel(){panel.close();resumeFromPanel();}
  $('menu-button').addEventListener('click',e=>openPanel('menu',e.currentTarget));$('last-trick').addEventListener('click',e=>openPanel('last',e.currentTarget));$('close-panel').addEventListener('click',closePanel);panel.addEventListener('close',resumeFromPanel);
  $('panel-body').addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.panel)openPanel(b.dataset.panel);else if(b.id==='save-settings'){settings={pace:$('pace').value,target:Number($('target').value)};try{localStorage.setItem(SETTINGS,JSON.stringify(settings));}catch{storageWarning='Settings cannot be saved in this browser.';}closePanel();}else if(b.id==='new-match'){newMatch(false);closePanel();}else if(b.id==='keep-playing')closePanel();});
  HeartsTouch.install(document.body,()=>[generation,state.phase,state.turn,dialogKind],{selector:'button',unavailable:()=>document.hidden,consumeOutsideClick:true,selectable:'.help-text'});
  document.addEventListener('pointerdown',e=>{held.add(e.pointerId);clearTimeout(timer);},true);for(const type of ['pointerup','pointercancel'])document.addEventListener(type,e=>{held.delete(e.pointerId);schedule();},true);
  for(const type of ['blur','pagehide'])window.addEventListener(type,()=>{held.clear();clearTimeout(timer);});
  document.addEventListener('visibilitychange',()=>{held.clear();if(document.hidden){clearTimeout(timer);save();}else schedule();});window.addEventListener('focus',schedule);
  load();render();if('serviceWorker' in navigator)navigator.serviceWorker.register('service-worker.js').then(()=>navigator.serviceWorker.ready).then(()=>{offlineReady=true;}).catch(()=>{offlineReady=false;});
})();
