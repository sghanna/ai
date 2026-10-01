'use strict';
window.CardProgress = (() => {
  const ids = ['hearts','euchre'];
  const keys = id => {
    if (!ids.includes(id)) throw new Error('Unknown game');
    return {game:`card-suite:pilot:${id}:game:v1`, settings:`card-suite:pilot:${id}:settings:v1`};
  };
  function valid(id, value) {
    try {
      if (id === 'hearts') return value?.version === 2 && HeartsEngine.validate(value.game);
      if (id === 'euchre') return Boolean(Euchre.restore(value));
    } catch {}
    return false;
  }
  function read(id) {
    const key = keys(id).game;
    let damaged = false;
    try {
      for (const candidate of [key, key+'-backup']) {
        const raw = localStorage.getItem(candidate);
        if (raw === null) continue;
        try {
          const value = JSON.parse(raw);
          if (valid(id,value)) return {state:'saved', value, raw, recovered:candidate!==key};
        } catch {}
        damaged = true;
      }
      return {state:damaged ? 'damaged' : 'empty'};
    } catch { return {state:'unavailable'}; }
  }
  return {ids, keys, valid, read};
})();
