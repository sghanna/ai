import * as E from './engine.js?v=1';
const $=id=>document.getElementById(id),KEY='ai-canasta-game-v1',SETTINGS='ai-canasta-settings-v1';
let state,record,selected=[],drafts=[],taking=false,revision=0,timer=null,pace=1600,lastGoodSave=null;
try {pace=Number(localStorage.getItem(SETTINGS))||1600;if(![800,1600,2800].includes(pace))pace=1600;}catch{}
function readSave() {
 for(const key of [KEY,KEY+'-backup'])try {
  const raw=localStorage.getItem(key);if(!raw)continue;const r=JSON.parse(raw),s=E.restore(r);state=s;record={version:1,seed:r.seed,actions:r.actions};
  const hand=s.hands[0],ui=r.ui||{},seen=new Set();selected=Array.isArray(ui.selected)?ui.selected.filter(id=>hand.includes(id)):[];
  taking=s.player===0&&s.phase==='draw'&&!!ui.taking;drafts=Array.isArray(ui.drafts)?ui.drafts.filter(g=>[...E.RANKS,'3'].includes(g.rank)&&Array.isArray(g.ids)&&g.ids.every(id=>hand.includes(id)&&!seen.has(id))&&g.ids.every(id=>(seen.add(id),true))).map(g=>({rank:g.rank,ids:[...g.ids]})):[];
  if(s.player!==0||!['draw','meld'].includes(s.phase)){selected=[];drafts=[];taking=false;}
  lastGoodSave=raw;
  if(key!==KEY)$('save-notice').textContent='Recovered the previous saved position.';
  return;
 }catch{}
 try{if(localStorage.getItem(KEY))$('save-notice').textContent='The saved match could not be read. A new match is ready.';}catch{}
 start(false);
}
function save(changed=false) {
 try {
  if(changed&&lastGoodSave)localStorage.setItem(KEY+'-backup',lastGoodSave);
  const raw=JSON.stringify({...record,ui:{selected,drafts,taking}});localStorage.setItem(KEY,raw);lastGoodSave=raw;
 }catch{$('save-notice').textContent='This browser cannot save progress. Keep this tab open to continue your match.';}
}
function start(persist=true) {state=E.newGame(crypto.getRandomValues(new Uint32Array(1))[0]);record={version:1,seed:state.seed,actions:[]};selected=[];drafts=[];taking=false;if(persist)save(true);}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function cardHTML(id,button=false) {const c=E.card(id),tag=button?'button':'div',staged=drafts.some(g=>g.ids.includes(id)),sel=selected.includes(id);return `<${tag} class="${button?'card':'playing-card'} ${c.red?'red':''} ${c.wild?'wild':''} ${sel?'selected':''} ${staged?'staged':''}" ${button?`data-card="${id}" aria-label="${esc(c.rank==='Joker'?'Joker':c.rank+' of '+({'♣':'clubs','♦':'diamonds','♥':'hearts','♠':'spades'}[c.suit]))}${staged?', staged':''}" aria-pressed="${sel}" ${state.player!==0||!['draw','meld'].includes(state.phase)||staged?'disabled':''}`:''}><span class="rank">${c.rank==='Joker'?'★':c.rank}</span><span class="suit">${c.rank==='Joker'?'JOKER':c.suit}</span><small class="card-note">${staged?'STAGED':c.wild?'WILD':c.rank==='3'?'STOP':sel?'✓':''}</small></${tag}>`;}
function closed(){return !document.querySelector('dialog[open]');}
function render() {
 clearTimeout(timer);const focus=document.activeElement?.dataset?.card,ours=state.player===0,live=['draw','meld'].includes(state.phase),drawing=ours&&state.phase==='draw',melding=ours&&state.phase==='meld';
 $('us-score').textContent=state.scores[0].toLocaleString();$('them-score').textContent=state.scores[1].toLocaleString();$('round').textContent='Hand '+state.round;
 for(const [i,prefix] of ['us','them'].entries()){
  const t=state.teams[i],canastas=Object.values(t.melds).filter(ids=>ids.length>=7).length;
  $(prefix+'-min').textContent=Object.keys(t.melds).length?'Team is open':'Open with '+E.minimum(state.scores[i])+' points';
  $(i?'their-canastas':'our-canastas').textContent=canastas?`${canastas} canasta${canastas===1?'':'s'}`:'No canasta yet';
  $(prefix+'-melds').innerHTML=Object.entries(t.melds).map(([rank,ids])=>{const wilds=ids.filter(id=>E.card(id).wild).length;return `<div class="meld ${ids.length>=7?'canasta':''} ${!wilds?'pure':''}"><strong>${esc(rank)}${rank==='3'?'♣':''}</strong><span>${ids.length} cards${ids.length>=7?' · '+(!wilds?'Natural':'Mixed'):''}</span><small>${wilds?wilds+' wild'+(wilds===1?'':'s'):'All natural'}${ids.length>=7?' · +'+(wilds?300:500):' · '+Math.max(0,7-ids.length)+' to canasta'}</small></div>`;}).join('')||'<p class="empty">Build sets of matching ranks here.</p>';
  $(prefix+'-reds').textContent=t.reds.length?`${t.reds.length} red three${t.reds.length===1?'':'s'} · ${t.reds.length===4?800:t.reds.length*100} ${Object.keys(t.melds).length?'bonus points':'points at risk until opening'}`:'No red threes';
 }
 $('players').innerHTML=[1,2,3].map(p=>`<div class="seat ${state.player===p&&live?'active':''}"><span>${E.NAMES[p]}</span><small>${state.hands[p].length} cards${p===2?' · with you':''}</small></div>`).join('');
 $('stock-count').textContent=state.stock.length+' cards';$('discard-count').textContent=state.discard.length+' cards';$('top-card').innerHTML=state.discard.length?cardHTML(state.discard.at(-1)):'<div class="playing-card empty-pile">Empty</div>';
 const frozen=state.frozen||!Object.keys(state.teams[0].melds).length;
 $('pile-note').textContent=state.discard.length&&!E.natural(state.discard.at(-1))?'Pile blocked · wait for a natural card':frozen?'Frozen for you · two natural cards needed':'Pile open · match its top card';
 $('turn-message').textContent=ours&&live?(drawing?'Your turn · draw first':'Your turn · meld, then discard'):state.message;
 $('step').textContent=!live?'Hand complete':!ours?'Computer turn':taking?'Plan pickup':drawing?'1 · Draw':'2 · Meld   3 · Discard';
 $('hand-count').textContent=state.hands[0].length+' cards';$('hand').innerHTML=E.sorted(state.hands[0]).map(id=>cardHTML(id,true)).join('');
 if(focus!==undefined)$('hand').querySelector(`[data-card="${focus}"]`)?.focus({preventScroll:true});
 $('guidance').textContent=!live?'Review the table, then continue when you are ready.':!ours?'Watch the table. Menu pauses play.':taking?'Stage cards to meld the top discard. Only the top card counts toward opening.':drawing?'Draw one card, or plan to take the whole discard pile.':'Select matching cards to stage a meld, or one card to discard.';
 $('selection-note').textContent=selected.length?`${selected.length} selected · ${E.value(selected)} points`:'Tap cards to select; tap again to change your mind.';
 $('drafts').innerHTML=drafts.map(g=>`<div class="draft"><span><b>${esc(g.rank)}s</b> · ${g.ids.length} from hand${taking&&E.card(state.discard.at(-1)).rank===g.rank?' + top discard':''} · ${E.value(g.ids)} points</span><button data-remove="${esc(g.rank)}" data-touch aria-label="Remove ${esc(g.rank)} meld from draft">Remove</button></div>`).join('');
 const verdict=E.preview(state,drafts,taking);
 if(drafts.length||taking)$('drafts').innerHTML+=`<p class="draft-total">${verdict.ok?`${verdict.points} points ready. Confirm when you are satisfied.`:esc(verdict.error)}</p>`;
 const onlyWild=selected.length&&selected.every(id=>E.card(id).wild);$('rank-picker').hidden=!onlyWild;
 if(onlyWild){const current=$('wild-rank').value,available=[...new Set([...Object.keys(state.teams[0].melds),...drafts.map(g=>g.rank)])].filter(r=>r!=='3');$('wild-rank').innerHTML=available.map(r=>`<option value="${r}">${r}s</option>`).join('');if(available.includes(current))$('wild-rank').value=current;}
 function button(id,show,disabled=false,label){$(id).hidden=!show;$(id).disabled=disabled;if(label)$(id).textContent=label;}
 button('draw',drawing&&!taking,E.forcedPickup(state),state.stock.length?'Draw a card':'End this hand');
 button('take',drawing&&!taking,!!E.pileReason(state));$('take').title=E.pileReason(state);
 button('stage',melding||taking,!selected.length||!!state.turn.mustOut,'Stage selected');
 button('commit',melding&&drafts.length>0||taking,!verdict.ok,taking?'Take pile & meld':'Confirm melds');
 button('discard-action',melding&&!drafts.length,selected.length!==1,'Discard selected');
 button('suggest',melding&&!drafts.length&&!selected.length,!!state.turn.mustOut);
 button('clear',ours&&(selected.length>0||drafts.length>0||taking),false,taking?'Cancel pickup':'Clear draft');
 button('show-result',!live);if(!live)prepareResult();
 schedule();
}
function say(msg){$('notice').textContent=msg;}
function apply(action) {try {state=E.act(state,action);record.actions.push(action);selected=[];drafts=[];taking=false;revision++;say('');save(true);render();if(!['draw','meld'].includes(state.phase)&&closed())open('result-dialog');}catch(e){say(e.message);}}
function schedule(){clearTimeout(timer);if(state.player===0||!['draw','meld'].includes(state.phase)||!closed()||document.hidden)return;const serial=state.serial;timer=setTimeout(()=>{if(serial!==state.serial||!closed()||document.hidden)return;const action=E.botAction(state);if(action)apply(action);},pace);}
function changed(){revision++;say('');save();render();}
$('hand').addEventListener('click',e=>{const b=e.target.closest('[data-card]');if(!b||b.disabled)return;const id=Number(b.dataset.card);selected=selected.includes(id)?selected.filter(x=>x!==id):[...selected,id];changed();});
$('stage').onclick=()=>{
 const ranks=[...new Set(selected.filter(id=>!E.card(id).wild).map(id=>E.card(id).rank))];
 if(ranks.length>1){say('Stage one rank at a time. You can confirm several ranks together.');return;}
 const rank=ranks[0]||$('wild-rank').value;if(!rank){say('Select at least two matching natural cards, or choose an existing meld for wilds.');return;}
 const existing=drafts.find(g=>g.rank===rank);if(existing)existing.ids.push(...selected);else drafts.push({rank,ids:[...selected]});selected=[];changed();
};
$('drafts').onclick=e=>{const b=e.target.closest('[data-remove]');if(!b)return;drafts=drafts.filter(g=>g.rank!==b.dataset.remove);changed();};
$('draw').onclick=()=>apply({type:'draw'});
$('take').onclick=()=>{taking=true;selected=[];const rank=E.card(state.discard.at(-1)).rank,team=state.teams[0],ids=state.hands[0].filter(id=>E.card(id).rank===rank).slice(0,2);if(!state.frozen&&team.melds[rank])drafts=[];else{if(ids.length===1)ids.push(state.hands[0].find(id=>E.card(id).wild));drafts=[{rank,ids}];}changed();};
$('commit').onclick=()=>apply({type:taking?'take':'meld',groups:drafts.map(g=>({rank:g.rank,ids:[...g.ids]}))});
$('discard-action').onclick=()=>{if(selected.length===1)apply({type:'discard',id:selected[0]});};
$('clear').onclick=()=>{selected=[];drafts=[];taking=false;changed();};
$('suggest').onclick=()=>{const groups=E.planMelds(state);if(groups?.length){drafts=groups;changed();say('Suggested melds are staged. Review them before confirming.');}else say('No meld fits right now. Select one card to discard.');};
let returnFocus=null;
function open(id){clearTimeout(timer);revision++;if(closed())returnFocus=document.activeElement;for(const d of document.querySelectorAll('dialog[open]'))d.close();$(id).showModal();}
function closeAll(){for(const d of document.querySelectorAll('dialog[open]'))d.close();revision++;if(returnFocus?.isConnected&&returnFocus.matches('button,a,select')&&!returnFocus.disabled&&!returnFocus.hidden)returnFocus.focus();else $('menu').focus();schedule();}
for(const b of document.querySelectorAll('[data-close]'))b.onclick=closeAll;
for(const d of document.querySelectorAll('dialog')){d.addEventListener('cancel',e=>{e.preventDefault();closeAll();});}
$('menu').onclick=()=>{$('pace').value=String(pace);open('menu-dialog');};$('help').onclick=()=>open('help-dialog');$('new').onclick=()=>open('new-dialog');
$('pace').onchange=()=>{pace=Number($('pace').value);try{localStorage.setItem(SETTINGS,String(pace));}catch{say('Computer pace changed for this visit.');}};
$('start-new').onclick=()=>{start();closeAll();render();};
$('history').onclick=()=>{$('history-content').innerHTML='<h3>Recent play</h3><ol>'+state.log.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol><h3>Completed hands</h3>'+(state.history.map(r=>`<p>Hand ${r.round}: You + Partner ${r.rows[0].total}; West + East ${r.rows[1].total}.</p>`).join('')||'<p>No hands finished yet.</p>');open('history-dialog');};
function prepareResult(){const r=state.result;if(!r)return;const win=state.scores[0]>state.scores[1];$('result-title').textContent=state.phase==='matchOver'?(win?'Your team wins!':'West + East win'):'Hand '+state.round+' complete';$('result-content').innerHTML=`<p>${esc(state.message)}</p><table><thead><tr><th>Points</th><th>You + Partner</th><th>West + East</th></tr></thead><tbody>${[['meldPoints','Melded cards'],['canastas','Canastas'],['redBonus','Red threes'],['outBonus','Going out'],['handPenalty','Cards left'],['total','This hand']].map(([k,label])=>`<tr><th>${label}</th>${r.rows.map(row=>'<td>'+(k==='handPenalty'?'−':'')+row[k]+'</td>').join('')}</tr>`).join('')}<tr class="total"><th>Match total</th><td>${state.scores[0]}</td><td>${state.scores[1]}</td></tr></tbody></table>`;$('next').textContent=state.phase==='matchOver'?'New match':'Next hand';}
$('next').onclick=()=>{closeAll();if(state.phase==='matchOver'){start();render();}else apply({type:'next'});};$('show-result').onclick=()=>open('result-dialog');
window.addEventListener('pagehide',()=>{clearTimeout(timer);save();});document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(timer);else schedule();});
readSave();render();save();
HeartsTouch.install(document.body,()=>[state.serial,revision,document.querySelector('dialog[open]')?.id],{selector:'#hand .card,button[data-touch]',unavailable:()=>document.hidden});
if('serviceWorker' in navigator){navigator.serviceWorker.register('./service-worker.js').then(()=>navigator.serviceWorker.ready).then(()=>{$('offline-status').textContent='Ready for offline play';}).catch(()=>{$('offline-status').textContent='Offline copy unavailable';});}else $('offline-status').textContent='Online play';
