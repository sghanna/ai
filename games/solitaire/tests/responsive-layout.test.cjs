// Renderer/state checks without a browser. These do not verify CSS layout,
// touch input, visual animation quality, or service-worker offline behavior.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

class Element {
  constructor(width = 0, height = 0) {
    this.width = width;
    this.clientHeight = height;
    this.children = [];
    this.style = { setProperty() {}, removeProperty(key) { delete this[key]; } };
    this.dataset = {};
    this.className = '';
    this.scrollTop = 0;
    this.classList = {
      contains: name => this.className.split(' ').includes(name),
      add: name => { if (!this.classList.contains(name)) this.className += ` ${name}`; },
      remove: name => { this.className = this.className.split(' ').filter(c => c !== name).join(' '); },
      toggle: (name, on) => on ? this.classList.add(name) : this.classList.remove(name)
    };
  }
  get clientWidth() { return Math.round(this.width || this.parent?.clientWidth || 0); }
  get offsetHeight() { return this.clientHeight || this.clientWidth * 1.5; }
  set innerHTML(value) { this.html = value; this.children = []; }
  get innerHTML() { return this.html; }
  appendChild(child) { child.parent = this; this.children.push(child); return child; }
  getBoundingClientRect() {
    const width = this.width || this.parent?.getBoundingClientRect().width || 0;
    return { left: 0, top: parseFloat(this.style.top) || 0, width, height: width * 1.5 };
  }
  closest() { return this.parent; }
  cloneNode() {
    const copy = new Element(this.clientWidth, this.offsetHeight);
    Object.assign(copy.style, this.style);
    copy.className = this.className;
    return copy;
  }
  removeAttribute(key) { delete this[key]; }
  remove() { this.parent.children = this.parent.children.filter(c => c !== this); }
}

function fixture(width = 390, height = 844) {
  const nodes = new Map();
  const events = {};
  const timers = new Map();
  let timerId = 0;
  const app = new Element(width, height);
  nodes.set('app-container', app);
  const document = {
    createElement: () => new Element(),
    getElementById: id => nodes.get(id) || null,
    documentElement: new Element(),
    addEventListener() {}
  };
  const window = {
    innerWidth: width, innerHeight: height,
    matchMedia: () => ({ matches: window.innerWidth >= 600 }),
    addEventListener: (event, fn) => { (events[event] ||= []).push(fn); }
  };
  const context = vm.createContext({
    window, document, console,
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; },
    clearTimeout: id => timers.delete(id),
    requestAnimationFrame: fn => fn()
  });
  for (const file of ['deck.js', 'game.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context);
  }
  const game = window.solitaireGame;
  game.boardEl = new Element(0, 600);
  game.stockEl = new Element();
  game.wasteEl = new Element();
  game.tableauEls = Array.from({ length: 7 }, () => {
    const col = new Element();
    col.className = 'tableau-col';
    return col;
  });
  game.foundationEls = Object.fromEntries(['S', 'H', 'C', 'D'].map(s => [s, new Element()]));
  function viewport(w, h) {
    window.innerWidth = w;
    window.innerHeight = h;
    // Expected grid geometry from the requested CSS, not a browser measurement.
    const padding = w >= 900 ? 24 : w >= 600 ? 20 : 8;
    const container = Math.min(w, w >= 900 ? 1080 : w >= 600 ? 880 : 430);
    const gap = Math.max(5, Math.min(12, w * 0.012));
    const cardWidth = (container - padding * 2 - gap * 6) / 7;
    for (const el of [game.stockEl, game.wasteEl, ...game.tableauEls]) el.width = cardWidth;
    game.boardEl.clientHeight = h - (w >= 600 ? 160 : 88) - cardWidth * 1.5;
    return cardWidth;
  }
  viewport(width, height);
  function flushTimers() {
    const pending = [...timers.values()];
    timers.clear();
    pending.forEach(fn => fn());
  }
  return { game, window, context, nodes, app, events, timers, viewport, flushTimers };
}

function card(rank, faceUp = true, suit = 'S') {
  return { id: `card-${suit}-${rank}`, rank, rankLabel: rank === 13 ? 'K' : rank === 12 ? 'Q' : rank === 11 ? 'J' : rank === 1 ? 'A' : String(rank), suit, color: 'black', faceUp };
}

test('390px phone keeps the original 32px/12px cascade and 24px waste fan', () => {
  const { game } = fixture();
  game.tableau[0] = [card(5, false), card(12), card(11)];
  game.waste = [card(9), card(8), card(7)];
  game.render();
  assert.deepEqual(game.tableauEls[0].children.map(c => c.style.top), ['0px', '12px', '44px']);
  assert.deepEqual(game.wasteEl.children.map(c => c.style.left), ['-48px', '-24px', '0px']);
  assert.equal(game.boardEl.classList.contains('scrollable-tableau'), false);
});

for (const [width, height, peek, downStep] of [[768, 1024, 61, 19], [1024, 768, 82, 24], [834, 1194, 67, 21], [1194, 834, 88, 24]]) {
  test(`${width}x${height}: readable cascades, scaled waste, unchanged game state`, () => {
    const { game } = fixture(width, height);
    game.tableau[0] = [card(5, false), card(12), card(11)];
    game.waste = [card(9), card(8), card(7)];
    const before = JSON.stringify([game.tableau, game.waste, game.moves, game.undoStack]);
    game.render();
    assert.deepEqual(game.tableauEls[0].children.map(c => c.style.top), ['0px', `${downStep}px`, `${downStep + peek}px`]);
    assert.deepEqual(game.wasteEl.children.map(c => c.style.left), ['-68px', '-34px', '0px']);
    assert.equal(JSON.stringify([game.tableau, game.waste, game.moves, game.undoStack]), before);
  });
}

test('deep landscape stacks scroll rather than clipping Queen tails; return to phone clears tablet height', () => {
  const { game, viewport } = fixture(1024, 768);
  game.tableau[0] = Array.from({ length: 13 }, (_, i) => card(13 - i));
  game.boardEl.scrollTop = 200;
  game.render();
  const tops = game.tableauEls[0].children.map(c => parseFloat(c.style.top));
  assert.equal(tops[2] - tops[1], 82);
  assert.equal(game.boardEl.classList.contains('scrollable-tableau'), true);
  assert.ok(parseFloat(game.tableauEls[0].style.minHeight) > tops.at(-1) + 193);
  assert.equal(game.boardEl.scrollTop, 200);
  viewport(390, 844);
  game.render();
  assert.equal(game.tableauEls[0].children[2].style.top, '64px');
  assert.equal(game.tableauEls[0].style.minHeight, '');
  assert.equal(game.boardEl.scrollTop, 0);
});

test('compression reduces face-down exposure while preserving rank clearance', () => {
  const { game } = fixture(1024, 768);
  game.tableau[0] = [card(6, false), card(5, false), card(4, false), ...Array.from({ length: 6 }, (_, i) => card(13 - i))];
  game.render();
  const tops = game.tableauEls[0].children.map(c => parseFloat(c.style.top));
  assert.equal(tops[1], 16);
  assert.equal(tops[4] - tops[3], 82);
});

test('a short phone never compresses its face-up spacing below 32px', () => {
  const { game } = fixture(390, 568);
  game.tableau[0] = [card(5, false), ...Array.from({ length: 13 }, (_, i) => card(13 - i))];
  game.render();
  const tops = game.tableauEls[0].children.map(c => parseFloat(c.style.top));
  assert.equal(tops[1], 12);
  assert.equal(tops[3] - tops[2], 32);
});

test('an emptied deep column clears its scroll height and retains the King target', () => {
  const { game } = fixture(1024, 768);
  game.tableau[0] = Array.from({ length: 13 }, (_, i) => card(13 - i));
  game.render();
  game.tableau[0] = [];
  game.selected = { pile: 'waste', card: card(13), cards: [card(13)] };
  game.render();
  assert.equal(game.tableauEls[0].style.minHeight, '');
  assert.equal(game.boardEl.classList.contains('scrollable-tableau'), false);
  assert.ok(game.tableauEls[0].children[0].classList.contains('valid-king-target'));
});

test('rotation debounces, waits for flight completion, and preserves selection and halo', () => {
  const f = fixture();
  const { game, window, events, timers, viewport, flushTimers } = f;
  game.tableau[0] = [card(12), card(11)];
  game.selected = { pile: 'tableau', colIndex: 0, card: game.tableau[0][0], cards: game.tableau[0] };
  const selection = game.selected;
  let renders = 0;
  let canvasResizes = 0;
  const render = game.render.bind(game);
  game.render = () => { renders++; render(); };
  window.solitaireCelebration = { resizeCanvas: () => canvasResizes++ };
  game.setupEventListeners();
  viewport(768, 1024);
  events.resize.forEach(fn => fn());
  events.orientationchange.forEach(fn => fn());
  events.resize.forEach(fn => fn());
  assert.equal(timers.size, 1);
  game.isAnimating = true;
  flushTimers();
  assert.equal(renders, 0);
  game.isAnimating = false;
  flushTimers();
  assert.equal(renders, 1);
  assert.equal(canvasResizes, 1);
  assert.equal(game.selected, selection);
  assert.equal(game.tableauEls[0].children[1].style.top, '61px');
  assert.equal(game.tableauEls[0].children.at(-1).id, 'active-selection-halo');
});

test('flight into a scrolling tableau uses a temporary overlay and cleans up', () => {
  const { game, app, nodes, flushTimers } = fixture(1024, 768);
  game.boardEl.classList.add('scrollable-tableau');
  const destination = new Element(129, 194);
  destination.id = 'moving-card';
  game.tableauEls[0].appendChild(destination);
  nodes.set(destination.id, destination);
  let completed = false;
  game.animateMove([destination.id], () => 42, result => { completed = result === 42; });
  assert.equal(destination.style.visibility, 'hidden');
  assert.equal(app.children.length, 1);
  assert.equal(app.children[0].id, undefined);
  flushTimers();
  assert.equal(destination.style.visibility, '');
  assert.equal(app.children.length, 0);
  assert.equal(game.isAnimating, false);
  assert.equal(completed, true);
});

test('Queen SVG control bounds fit inside the 33-unit cascade clearance', () => {
  const { context } = fixture();
  const { d, h, offset } = vm.runInContext('({d: VECTORS.Q.d, h: VECTORS.Q.h, offset: OFFSETS.Q[1]})', context);
  const tokens = d.match(/[a-z]|-?\d+(?:\.\d+)?/ig);
  let x = 0, y = 0, minY = Infinity, command, startX, startY;
  while (tokens.length) {
    if (/^[a-z]$/i.test(tokens[0])) command = tokens.shift();
    if (command === 'z') { x = startX; y = startY; command = null; continue; }
    if (command === 'M' || command === 'm' || command === 'l') {
      const a = Number(tokens.shift()), b = Number(tokens.shift());
      x = command === 'M' ? a : x + a;
      y = command === 'M' ? b : y + b;
      if (command !== 'l') { startX = x; startY = y; }
      minY = Math.min(minY, y);
    } else if (command === 'c') {
      const p = tokens.splice(0, 6).map(Number);
      // A Bezier curve stays inside its control polygon: conservative bound.
      minY = Math.min(minY, y, y + p[1], y + p[3], y + p[5]);
      x += p[4]; y += p[5];
    } else { assert.fail(`Unsupported Q path command ${command}`); }
  }
  const bottom = offset + 0.166667 * (h - minY * 0.1);
  assert.ok(bottom > 32 && bottom < 33, `Q bottom bound: ${bottom}`);
});
