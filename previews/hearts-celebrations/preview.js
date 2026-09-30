'use strict';
document.getElementById('queen-preview').innerHTML=cardSVG('Q','S');
document.getElementById('cards-preview').innerHTML=['A','7','K'].map(rank=>cardSVG(rank,'H')).join('');
const previews={
  moon:{title:'You shot the moon',detail:'Each opponent gets 26 points.'},
  win:{title:'You won!',detail:'21 points · lowest total'},
  clean:{title:'A clean hand!',detail:'No points added. Nicely played.'}
};
document.querySelectorAll('[data-kind]').forEach(button=>button.addEventListener('click',()=>{
  const kind=button.dataset.kind;
  HeartsCelebration.show({kind,...previews[kind],onFinish:()=>button.focus({preventScroll:true})});
}));
const dialog=document.getElementById('celebration-dialog');
const touch=HeartsTouch.install(dialog,()=>[],{selector:'button',unavailable:()=>!dialog.open,consumeOutsideClick:true});
dialog.addEventListener('close',touch.cancel);
HeartsTouch.install(document.querySelector('main'),()=>[],{selector:'button'});
