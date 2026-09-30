'use strict';
(() => {
  const E=Euchre, KEY='ai-euchre-game-v1', SETTINGS='ai-euchre-settings-v1';
  const names=['You','West','Partner','East'];
  const suits={S:'Spades',H:'Hearts',C:'Clubs',D:'Diamonds'},symbols={S:'♠',H:'♥',C:'♣',D:'♦'};
  const rankNames={J:'Jack',Q:'Queen',K:'King',A:'Ace','9':'9','10':'10'};
  const $=id=>document.getElementById(id), panel=$('panel');
  let settings={pace:'relaxed',stickDealer:true,bowerLabels:true};
  try {const saved=JSON.parse(localStorage.getItem(SETTINGS));if(saved){settings={pace:saved.pace==='steady'?'steady':'relaxed',stickDealer:saved.stickDealer!==false,bowerLabels:saved.bowerLabels!==false};}}catch{}
  let record, state, lastSaved=null, selection={card:null,bid:null,alone:false}, timer, generation=0, dialogKind='', opener=null, storageWarning='', offlineReady=false;
  const held=new Set();
  function cardName(id,trump=state?.trump) {
    const c=E.card(id);return `${rankNames[c.rank]} of ${suits[c.suit]}`+(trump&&E.isLeft(id,trump)?`, left bower; counts as ${suits[trump]}`:trump&&E.isRight(id,trump)?', right bower':'');
  }
  function shortCard(id) {const c=E.card(id);return `${c.rank}${symbols[c.suit]}`;}
  function face(id) {const c=E.card(id);return cardSVG(c.rank,c.suit);}
  function load() {
    let damaged=false;
    for(const key of [KEY,KEY+'-backup']){
      try {
        const raw=localStorage.getItem(key);if(!raw)continue;
        const data=JSON.parse(raw),game=E.restore(data);
        record=data;state=game;lastSaved=raw;
        if(data.selection&&typeof data.selection==='object'){
          selection={card:state.hands[0].includes(data.selection.card)?data.selection.card:null,bid:data.selection.bid==='pass'||E.SUITS.includes(data.selection.bid)?data.selection.bid:null,alone:data.selection.alone===true};
        }
        if(key!==KEY)storageWarning='Recovered the previous saved position.';
        return;
      }catch{damaged=true;}
    }
    if(damaged)storageWarning='The saved game could not be read. A new match is ready.';
    newMatch(false);
  }
  function save() {
    record.selection={...selection};
    try {
      const data=JSON.stringify(record);
      if(lastSaved)localStorage.setItem(KEY+'-backup',lastSaved);
      localStorage.setItem(KEY,data);lastSaved=data;
    }catch{storageWarning='This browser cannot save progress. Keep this tab open to finish your match.';}
  }
  function newMatch(draw=true) {
    const initial={deck:E.shuffled(),dealer:3,stickDealer:settings.stickDealer};
    record={version:1,initial,actions:[]};state=E.start(initial);selection={card:null,bid:null,alone:false};save();if(draw)render();
  }
  function commit(action) {
    try {const next=E.step(state,action);record.actions.push(action);state=next;selection={card:null,bid:null,alone:false};save();render();}
    catch(error){storageWarning=error.message;render();}
  }
  function humanTurn() {return ['bid','discard','play'].includes(state.phase)&&state.turn===0;}
  function schedule() {
    clearTimeout(timer);
    if(document.hidden||panel.open||held.size||!['bid','discard','play'].includes(state.phase)||state.turn===0)return;
    const stamp=generation;
    timer=setTimeout(()=>{if(stamp===generation&&!document.hidden&&!panel.open&&!held.size)commit(E.chooseAction(E.viewFor(state,state.turn)));},settings.pace==='steady'?750:1400);
  }
  function statusText() {
    const p=state.phase;
    if(p==='bid'){
      const last=state.bids.at(-1);
      const intro=last?`${names[last.player]} passed. `:'';
      if(state.turn!==0)return [`${names[state.turn]} is deciding…`,`${intro}${state.round===1?'First':'Second'} round of bidding.`];
      if(state.round===1)return [state.dealer===0?'Pick it up or pass?':'Order it up or pass?',`${shortCard(state.upcard)} is face up. ${state.dealer===0?'You':names[state.dealer]} would pick it up.`];
      return ['Choose trump',state.dealer===0&&state.stickDealer?'You are the dealer and must choose a suit.':`${symbols[E.card(state.upcard).suit]} ${suits[E.card(state.upcard).suit]} was turned down.`];
    }
    if(p==='discard')return state.turn===0?['Choose one card to discard','Six cards for now. Tap a card, then confirm.']:[`${names[state.turn]} is discarding…`,`${names[state.maker]} called ${suits[state.trump]}${state.alone?' alone':''}.`];
    if(p==='play'){
      if(state.turn!==0)return [`${names[state.turn]} is playing…`,state.sittingOut===0?'Your partner is going alone. You sit out this hand.':`${names[state.maker]} called ${suits[state.trump]}${state.alone?' alone':''}.`];
      const led=state.trick.length?E.effectiveSuit(state.trick[0].card,state.trump):null;
      const must=led&&state.hands[0].some(id=>E.effectiveSuit(id,state.trump)===led);
      return ['Your turn',selection.card?cardName(selection.card):led?(must?`Follow ${suits[led]}. Choose a card, then play.`:'You have none of the led suit. Play any card.'):'You lead. Choose any card, then play.'];
    }
    if(p==='trick')return [`${names[state.turn]} ${state.turn===0?'win':'wins'} the trick`,`${shortCard(E.winningPlay(state.trick,state.trump).card)} wins. Take your time reviewing the cards.`];
    if(p==='redeal')return ['Everyone passed','No points scored. The deal moves one seat clockwise.'];
    const r=state.result,who=r.team===0?'Your team':'West + East';
    const label=r.kind==='euchre'?'Euchre! ':r.kind==='lone-march'?'Lone sweep! ':r.kind==='march'?'All five tricks! ':'';
    if(p==='matchOver')return [state.score[0]>=10?'Your team wins!':'West + East win',`${label}${who} earned ${r.points} ${r.points===1?'point':'points'}.`];
    return [`${label}${who} +${r.points}`,`${names[state.maker]} called ${suits[state.trump]}${state.alone?' alone':''}. Tricks: ${state.tricks[0]}–${state.tricks[1]}.`];
  }
  function render() {
    generation++;
    const permittedCards=state.turn===0&&state.phase==='discard'?state.hands[0]:state.turn===0&&state.phase==='play'?E.legalCards(state.hands[0],state.trick,state.trump):[];
    if(!permittedCards.includes(selection.card))selection.card=null;
    const permittedBids=state.phase==='bid'&&state.turn===0?[...(state.round===2&&state.dealer===0&&state.stickDealer?[]:['pass']),...(state.round===1?[E.card(state.upcard).suit]:E.SUITS.filter(s=>s!==E.card(state.upcard).suit))]:[];
    if(!permittedBids.includes(selection.bid))selection.bid=null;
    if(!selection.bid||selection.bid==='pass')selection.alone=false;
    const focused=document.activeElement, focusId=focused?.id,focusCard=focused?.dataset?.card,focusBid=focused?.dataset?.bid;
    $('us-score').textContent=state.score[0];$('them-score').textContent=state.score[1];
    $('trump').textContent=state.trump?`${symbols[state.trump]} ${suits[state.trump]} trump`:'Choosing trump';
    $('contract').textContent=state.trump?`${names[state.maker]} called${state.alone?' · alone':''}`:`Hand ${state.handNumber} · round ${state.round}`;
    const visibleTricks=[...state.tricks];if(state.phase==='trick')visibleTricks[state.turn%2]++;
    $('tricks').textContent=`Tricks: us ${visibleTricks[0]} · them ${visibleTricks[1]}`;
    $('last-trick').disabled=!state.completed.length;
    for(let p=0;p<4;p++){
      const seat=$('seat-'+p),active=['bid','discard','play'].includes(state.phase)&&state.turn===p;
      seat.className=`seat ${['south','west','north','east'][p]}${active?' active':''}${state.sittingOut===p?' sitting':''}`;
      seat.innerHTML=`<b>${names[p]}${p===2?' <span aria-label="your partner">♡</span>':''}</b><small${p===state.dealer?' class="dealer"':''}>${state.sittingOut===p?'Sitting out':p===state.dealer?'Dealer':p===2?'Your teammate':p===0?'You + Partner':'Opponent'}</small>`;
    }
    $('table').classList.toggle('bidding',state.phase==='bid');
    const center=$('table-center');
    if(state.phase==='bid') center.innerHTML=state.round===1?`<div class="upcard">${face(state.upcard)}<span>Turned up · ${shortCard(state.upcard)}</span></div>`:`<div class="upcard"><div class="turned-card" aria-hidden="true">E</div><span>${shortCard(state.upcard)} turned down</span></div>`;
    else if(state.trick.length)center.innerHTML=state.trick.map(p=>`<div class="played p${p.player}${state.phase==='trick'&&p.player===state.turn?' winner':''}" role="img" aria-label="${names[p.player]}: ${cardName(p.card)}${state.phase==='trick'&&p.player===state.turn?', winner':''}">${face(p.card)}</div>`).join('');
    else if(['handOver','matchOver','redeal'].includes(state.phase))center.innerHTML=`<div class="table-message"><span>${state.phase==='redeal'?'No trump chosen':state.phase==='matchOver'?'Final score':'Match score'}</span><strong>${state.score[0]} — ${state.score[1]}</strong><span>You + Partner · West + East</span></div>`;
    else center.innerHTML=`<div class="table-message"><strong>${symbols[state.trump]}</strong><span>${suits[state.trump]} are trump</span><span class="bowers">Right ${shortCard('J'+state.trump)} · Left ${shortCard('J'+E.PAIR[state.trump])}</span></div>`;
    const canSelect=state.turn===0&&['play','discard'].includes(state.phase),legal=state.phase==='play'?E.legalCards(state.hands[0],state.trick,state.trump):state.hands[0];
    const sorted=[...state.hands[0]].sort((a,b)=>{
      const suitOrder=id=>(E.effectiveSuit(id,state.trump)===state.trump?-1:E.SUITS.indexOf(E.effectiveSuit(id,state.trump)));
      return suitOrder(a)-suitOrder(b)||E.strength(b,state.trump)-E.strength(a,state.trump);
    });
    $('hand').innerHTML=sorted.map(id=>{
      const allowed=canSelect&&legal.includes(id),left=state.trump&&E.isLeft(id,state.trump),right=state.trump&&E.isRight(id,state.trump);
      const tag=settings.bowerLabels&&(left||right)?`<span class="card-tag${left?' left':''}">${left?'Left':'Right'} bower</span>`:'';
      return `<button type="button" class="card${(canSelect&&!legal.includes(id))||(state.sittingOut===0&&state.phase!=='discard')?' unplayable':''}" data-card="${id}" aria-label="${cardName(id)}${canSelect&&!legal.includes(id)?'; cannot follow suit':''}" aria-pressed="${selection.card===id}" ${allowed?'':'disabled'}>${face(id)}${tag}</button>`;
    }).join('');
    if(!sorted.length)$('hand').innerHTML='<p class="bowers">All five cards played</p>';
    $('hand-note').textContent=state.sittingOut===0&&state.phase!=='discard'?'Partner is playing alone':canSelect?'Choose, then confirm':state.trump?'Bowers belong to trump':'Five cards. One team.';
    document.querySelector('.player-zone').classList.toggle('live-turn',humanTurn());
    const [instruction,detail]=statusText();$('instruction').textContent=instruction;$('detail').textContent=detail;
    const choices=$('choices'),alone=$('alone'),primary=$('primary-action');choices.innerHTML='';alone.hidden=true;primary.disabled=false;
    if(state.phase==='bid'&&state.turn===0){
      const passAllowed=!(state.round===2&&state.dealer===0&&state.stickDealer);
      const available=state.round===1?[E.card(state.upcard).suit]:E.SUITS.filter(s=>s!==E.card(state.upcard).suit);
      choices.className='choices'+(state.round===1?' two':'');
      choices.innerHTML=(passAllowed?`<button class="choice" data-bid="pass" aria-pressed="${selection.bid==='pass'}">Pass</button>`:'')+available.map(s=>`<button class="choice" data-bid="${s}" aria-label="${suits[s]}${state.round===1?(state.dealer===0?', pick up':', order up'):''}" aria-pressed="${selection.bid===s}">${symbols[s]} ${state.round===1?(state.dealer===0?'Pick up':'Order up'):`<small>${suits[s]}</small>`}</button>`).join('');
      alone.hidden=!available.includes(selection.bid);alone.setAttribute('aria-pressed',String(selection.alone));
      primary.disabled=!selection.bid;
      primary.textContent=selection.bid==='pass'?'Confirm pass':selection.bid?`${state.round===1?(state.dealer===0?'Pick up':'Order up'):'Call'} ${suits[selection.bid]}${selection.alone?' alone':''}`:passAllowed?'Choose pass or trump':'Choose trump';
    }else if(canSelect){primary.disabled=!selection.card;primary.textContent=selection.card?`${state.phase==='discard'?'Discard':'Play'} ${shortCard(selection.card)}`:state.phase==='discard'?'Choose a card to discard':'Choose a card to play';}
    else if(state.phase==='trick')primary.textContent=state.completed.length===4?'See hand score':'Next trick';
    else if(['handOver','redeal'].includes(state.phase))primary.textContent='Deal next hand';
    else if(state.phase==='matchOver')primary.textContent='Play again';
    else{primary.textContent='Waiting for '+names[state.turn];primary.disabled=true;}
    $('storage-note').textContent=storageWarning;
    if(!panel.open){const target=focusCard?document.querySelector(`[data-card="${focusCard}"]`):focusBid?document.querySelector(`[data-bid="${focusBid}"]`):focusId?$(focusId):null;if(target&&!target.disabled)target.focus({preventScroll:true});}
    schedule();
  }
  $('hand').addEventListener('click',event=>{const b=event.target.closest('[data-card]');if(!b||b.disabled)return;selection.card=selection.card===b.dataset.card?null:b.dataset.card;save();render();});
  $('choices').addEventListener('click',event=>{const b=event.target.closest('[data-bid]');if(!b)return;selection.bid=b.dataset.bid;if(selection.bid==='pass')selection.alone=false;save();render();});
  $('alone').addEventListener('click',()=>{selection.alone=!selection.alone;save();render();});
  $('primary-action').addEventListener('click',()=>{
    if(panel.open)return;
    if(state.phase==='bid'&&state.turn===0&&selection.bid)commit({type:'bid',suit:selection.bid==='pass'?null:selection.bid,alone:selection.alone});
    else if(['discard','play'].includes(state.phase)&&state.turn===0&&selection.card)commit({type:state.phase,card:selection.card});
    else if(state.phase==='trick')commit({type:'collect'});
    else if(['handOver','redeal'].includes(state.phase))commit({type:'nextHand',deck:E.shuffled()});
    else if(state.phase==='matchOver')newMatch();
  });
  const help=`<div class="help-text"><h3>Play as a team</h3><p>You and Partner sit opposite each other. Win tricks together against West and East. A trick is one card from each active player. The first team to 10 points wins.</p><h3>Choose trump</h3><p>We use 24 cards: 9, 10, J, Q, K and A of each suit. Everyone gets five. Bidding starts to the dealer's left and goes clockwise.</p><p>In round one, order up the face-up card or pass. If anyone orders it up, the dealer takes that card and discards one. Its suit becomes trump. The dealer can choose to pick it up too.</p><p>If everyone passes, round two offers the other three suits. With “Dealer must choose” on, the dealer cannot pass again. With it off, four more passes move the deal to the next player.</p><h3>The two bowers</h3><p>The jack of trump is the right bower, the strongest card. The other jack of the same color is the left bower. It becomes trump for this hand, including when following suit.</p><div class="suit-guide">If Hearts are trump:<br>J♥ → J♦ → A♥ → K♥ → Q♥ → 10♥ → 9♥<br><small>J♦ counts as a heart, never a diamond.</small></div><h3>Follow suit</h3><p>The first active player to the dealer's left leads. Play the suit led if you have it; otherwise, play any card. Highest trump wins, or the highest card of the led suit when no trump is played. The winner leads next.</p><p>Tap a card, then use Play to confirm. You can change your selection first. Darkened cards cannot follow suit. Every completed trick waits for you to continue.</p><h3>Go alone</h3><p>The player who calls trump may choose Go alone before confirming. Their partner sits out. The dealer still picks up and discards in round one, even when sitting out. Three cards complete each trick. Defenders cannot call alone in this version.</p><h3>Score each hand</h3><p>Makers need at least three of the five tricks. Three or four earn 1 point; all five earn 2. All five when going alone earn 4. If the makers take fewer than three, the defenders earn 2. No extra penalty applies to an unsuccessful lone hand.</p><h3>Save and play offline</h3><p>Progress saves on this browser after each action. Menu pauses computer play. Finish loading once online before using the game offline. In Safari, use Share → Add to Home Screen to keep it handy. Clearing website data removes saved games.</p><p>Rules: <a href="https://www.pagat.com/euchre/euchre.html#northam" target="_blank" rel="noopener">North American Euchre, Pagat</a> and <a href="https://bicyclecards.com/how-to-play/euchre" target="_blank" rel="noopener">Bicycle</a>. House rules are shown in Settings.</p></div>`;
  function openPanel(kind,trigger=null) {
    if(!panel.open)opener=trigger||document.activeElement;
    clearTimeout(timer);dialogKind=kind;generation++;
    const body=$('panel-body');
    if(kind==='menu'){
      $('panel-title').textContent='At the table';
      body.innerHTML=`<div class="menu-list"><button data-panel="help">How to play <span>›</span></button><button data-panel="settings">Settings <span>›</span></button><button data-panel="bidding">Bidding this hand <span>›</span></button><button data-panel="new">New match <span>›</span></button></div><p class="bowers">${offlineReady?'Ready to play offline.':'Offline copy prepares after loading online.'} Your match saves on this browser.</p>`;
    }else if(kind==='help'){$('panel-title').textContent='How to play';body.innerHTML=help;}
    else if(kind==='settings'){
      $('panel-title').textContent='Settings';
      body.innerHTML=`<label class="setting"><span>Computer pace</span><select id="pace"><option value="relaxed">Relaxed</option><option value="steady">Steady</option></select><small>Every completed trick waits for you.</small></label><label class="setting"><span>Bower labels on your cards</span><select id="bower-labels"><option value="yes">Show labels</option><option value="no">Hide labels</option></select></label><label class="setting"><span>Dealer must choose in round two</span><select id="stick-dealer"><option value="yes">On · stick the dealer</option><option value="no">Off · allow a redeal</option></select><small>Applies to the next match. This match: ${state.stickDealer?'on':'off'}.</small></label><button id="save-settings" class="primary">Save settings</button>`;
      $('pace').value=settings.pace;$('bower-labels').value=settings.bowerLabels?'yes':'no';$('stick-dealer').value=settings.stickDealer?'yes':'no';
    }else if(kind==='new'){
      $('panel-title').textContent='Start a new match?';body.innerHTML='<p>This replaces your saved match and resets both teams to zero.</p><button id="new-match" class="primary">Start new match</button><button id="keep-playing" class="primary quiet">Keep playing</button>';
    }else if(kind==='bidding'){
      $('panel-title').textContent='Bidding this hand';body.innerHTML=`<p>Dealer: ${names[state.dealer]}. Turned up: ${shortCard(state.upcard)}.</p><ol class="bid-log">${state.bids.map(b=>`<li>Round ${b.round} · ${names[b.player]} ${b.suit?`called ${suits[b.suit]}${b.alone?' alone':''}`:'passed'}</li>`).join('')}</ol>${state.bids.length?'':'<p>No bids yet.</p>'}`;
    }else if(kind==='last'){
      const last=state.completed.at(-1);if(!last)return;
      $('panel-title').textContent=`${names[last.winner]} won the last trick`;
      body.innerHTML=`<p>${symbols[state.trump]} ${suits[state.trump]} trump</p><div class="last-grid">${last.plays.map(p=>`<div>${names[p.player]}<div role="img" aria-label="${cardName(p.card)}">${face(p.card)}</div>${p.player===last.winner?'<small>Winner</small>':''}</div>`).join('')}</div>`;
    }
    body.scrollTop=0;if(!panel.open)panel.showModal();$('close-panel').focus({preventScroll:true});
  }
  function resumeFromPanel(){
    if(!dialogKind)return;
    dialogKind='';generation++;render();
    if(opener?.matches('button')&&opener.isConnected&&!opener.disabled)opener.focus({preventScroll:true});else $('menu-button').focus({preventScroll:true});
  }
  function closePanel(){panel.close();resumeFromPanel();}
  $('menu-button').addEventListener('click',event=>openPanel('menu',event.currentTarget));
  $('last-trick').addEventListener('click',event=>openPanel('last',event.currentTarget));
  $('close-panel').addEventListener('click',closePanel);
  panel.addEventListener('close',resumeFromPanel);
  $('panel-body').addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b)return;
    if(b.dataset.panel)openPanel(b.dataset.panel);
    else if(b.id==='save-settings'){
      settings={pace:$('pace').value,stickDealer:$('stick-dealer').value==='yes',bowerLabels:$('bower-labels').value==='yes'};
      try{localStorage.setItem(SETTINGS,JSON.stringify(settings));}catch{storageWarning='Settings cannot be saved in this browser.';}
      closePanel();
    }else if(b.id==='new-match'){newMatch(false);closePanel();}
    else if(b.id==='keep-playing')closePanel();
  });
  HeartsTouch.install(document.body,()=>[generation,state.phase,state.turn,dialogKind],{selector:'button',unavailable:()=>document.hidden,consumeOutsideClick:true,selectable:'.help-text'});
  document.addEventListener('pointerdown',event=>{held.add(event.pointerId);clearTimeout(timer);},true);
  for(const type of ['pointerup','pointercancel'])document.addEventListener(type,event=>{held.delete(event.pointerId);schedule();},true);
  for(const type of ['blur','pagehide'])window.addEventListener(type,()=>{held.clear();clearTimeout(timer);});
  document.addEventListener('visibilitychange',()=>{held.clear();if(document.hidden){clearTimeout(timer);save();}else schedule();});
  window.addEventListener('focus',schedule);
  load();render();
  if('serviceWorker' in navigator){navigator.serviceWorker.register('service-worker.js').then(()=>navigator.serviceWorker.ready).then(()=>{offlineReady=true;}).catch(()=>{offlineReady=false;});}
})();
