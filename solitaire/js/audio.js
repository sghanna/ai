/**
 * agy-solitaire: Web Audio API Synthesizer
 * Gentle, crisp audio feedback for low-vision reinforcement
 * Zero external asset dependencies
 */

class SolitaireAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.unlocked = false;

    // Load saved mute setting (defaults to false / unmuted)
    try {
      this.muted = localStorage.getItem('agy_solitaire_muted') === 'true';
    } catch (e) {
      this.muted = false;
    }

    // Auto-unlock Web Audio on first user interaction anywhere on the screen
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      const unlock = () => {
        this.init();
        if (this.ctx && this.ctx.state === 'running' && typeof window.removeEventListener === 'function') {
          ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(evt => {
            window.removeEventListener(evt, unlock, true);
          });
        }
      };
      ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(evt => {
        window.addEventListener(evt, unlock, { capture: true, passive: true });
      });
    }
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        try {
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.muted ? 0.0 : 1.0, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
        } catch (e) {}
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    // iOS / Safari hardware unlock with 1-sample silent buffer
    if (this.ctx && !this.unlocked) {
      try {
        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start(0);
        this.unlocked = true;
      } catch (e) {}
    }
  }

  getDestination() {
    return this.masterGain || (this.ctx ? this.ctx.destination : null);
  }

  getOutputTime() {
    if (!this.ctx) return 0;
    return Math.max(this.ctx.currentTime, 0.005) + 0.003;
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem('agy_solitaire_muted', this.muted);
    } catch (e) {}

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0.0 : 1.0, this.ctx.currentTime);
    }

    // When unmuting, provide immediate pleasant audible confirmation
    if (!this.muted) {
      this.init();
      this.playCardPlace();
    }
    return this.muted;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    try {
      localStorage.setItem('agy_solitaire_muted', this.muted);
    } catch (e) {}

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0.0 : 1.0, this.ctx.currentTime);
    }
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  // Soft felt card snap / placement (Dual-layer for rich mobile & laptop speaker presence)
  playCardPlace() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const dest = this.getDestination();
    if (!dest) return;
    const t = this.getOutputTime();

    // Layer 1: Crisp tactile snap (cuts through phone speakers)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(440, t);
    osc1.frequency.exponentialRampToValueAtTime(180, t + 0.045);

    gain1.gain.setValueAtTime(0.35, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc1.connect(gain1);
    gain1.connect(dest);
    osc1.start(t);
    osc1.stop(t + 0.06);

    // Layer 2: Warm body thud
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(240, t);
    osc2.frequency.exponentialRampToValueAtTime(110, t + 0.07);

    gain2.gain.setValueAtTime(0.28, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc2.connect(gain2);
    gain2.connect(dest);
    osc2.start(t);
    osc2.stop(t + 0.08);
  }

  // Pleasant card flip
  playCardFlip() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const dest = this.getDestination();
    if (!dest) return;
    const t = this.getOutputTime();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, t);
    osc.frequency.exponentialRampToValueAtTime(680, t + 0.08);

    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  // Cheerful foundation chime (rising pitch based on card rank 1-13)
  playFoundation(rank = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const dest = this.getDestination();
    if (!dest) return;

    const baseFreq = 440; // A4
    const scaleSteps = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21];
    const semitones = scaleSteps[(rank - 1) % scaleSteps.length];
    const freq = baseFreq * Math.pow(2, semitones / 12);

    const t = this.getOutputTime();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  // Sparkling ascending chime for Ace landing in foundation
  playAceCelebration() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const dest = this.getDestination();
    if (!dest) return;

    const t = this.getOutputTime();
    const notes = [783.99, 1046.50, 1318.51, 1567.98]; // G5, C6, E6, G6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + i * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.32, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(noteTime);
      osc.stop(noteTime + 0.48);
    });
  }

  // Crisp Stock draw sound (card slide)
  playStockDraw() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const dest = this.getDestination();
    if (!dest) return;
    const t = this.getOutputTime();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(540, t + 0.06);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  // Subtle reverse swoosh for Undo
  playUndo() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const dest = this.getDestination();
    if (!dest) return;
    const t = this.getOutputTime();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.1);

    gain.gain.setValueAtTime(0.30, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.11);
  }

  // Crisp card select tick
  playCardSelect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const dest = this.getDestination();
    if (!dest) return;
    const t = this.getOutputTime();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.04);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  // Gentle double wood-knock for invalid destination
  playInvalidMove() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const dest = this.getDestination();
    if (!dest) return;
    const t = this.getOutputTime();

    [240, 190].forEach((freq, i) => {
      const noteTime = t + i * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.28, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.05);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(noteTime);
      osc.stop(noteTime + 0.06);
    });
  }

  // Grand celebratory arpeggio for game victory
  playVictory() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const dest = this.getDestination();
    if (!dest) return;

    // Major pentatonic victory fanfare: C5, E5, G5, C6, E6, G6
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    const startTime = this.getOutputTime();

    notes.forEach((freq, i) => {
      const t = startTime + (i * 0.12);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = i === notes.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const duration = i === notes.length - 1 ? 0.8 : 0.22;
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(t);
      osc.stop(t + duration + 0.05);
    });
  }
}

const SOUND_ICONS = {
  1: {
    name: 'Antique Brass Horn',
    unmuted: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#d4af37" fill-opacity="0.25"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </svg>`,
    muted: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#d4af37" fill-opacity="0.25"/>
              <line x1="23" y1="9" x2="17" y2="15"/>
              <line x1="17" y1="9" x2="23" y2="15"/>
            </svg>`
  },
  2: {
    name: 'Gramophone Flare',
    unmuted: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M 3,10 L 7,10 L 12,6 L 12,18 L 7,14 L 3,14 Z" fill="#bca55c"/>
                <path d="M 12,9 Q 15,9 16,7 Q 17,5 17,3" stroke="#fef08a"/>
                <path d="M 16,10 A 4,4 0 0 1 16,14" stroke="#fef08a"/>
                <path d="M 19,7 A 8,8 0 0 1 19,17" stroke="#fef08a"/>
              </svg>`,
    muted: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M 3,10 L 7,10 L 12,6 L 12,18 L 7,14 L 3,14 Z" fill="#bca55c"/>
              <line x1="2" y1="2" x2="22" y2="22" stroke="#ef4444" stroke-width="2"/>
            </svg>`
  },
  3: {
    name: 'Pure Geometric Line',
    unmuted: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>`,
    muted: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z"/>
              <line x1="23" y1="1" x2="1" y2="23"/>
            </svg>`
  },
  4: {
    name: 'Musical Note & Wave',
    unmuted: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18V5l12-2v13" fill="none"/>
                <circle cx="6" cy="18" r="3" fill="#d4af37"/>
                <circle cx="18" cy="16" r="3" fill="#d4af37"/>
              </svg>`,
    muted: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 18V5l12-2v13" fill="none" opacity="0.4"/>
              <circle cx="6" cy="18" r="3" fill="#d4af37" opacity="0.4"/>
              <circle cx="18" cy="16" r="3" fill="#d4af37" opacity="0.4"/>
              <line x1="2" y1="2" x2="22" y2="22" stroke="#ef4444" stroke-width="2.2"/>
            </svg>`
  },
  5: {
    name: 'Acoustic Chime Bell',
    unmuted: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill="#d4af37" fill-opacity="0.25"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>`,
    muted: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill="#d4af37" fill-opacity="0.15"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              <line x1="2" y1="2" x2="22" y2="22" stroke="#ef4444" stroke-width="2.2"/>
            </svg>`
  }
};

function getSoundIconSVG(isMuted, style) {
  let chosen = style;
  if (!chosen) {
    try {
      chosen = localStorage.getItem('agy-sound-icon-style') || '4';
    } catch (e) {
      chosen = '4';
    }
  }
  const entry = SOUND_ICONS[chosen] || SOUND_ICONS['4'];
  return isMuted ? entry.muted : entry.unmuted;
}

window.SOUND_ICONS = SOUND_ICONS;
window.getSoundIconSVG = getSoundIconSVG;
window.solitaireAudio = new SolitaireAudio();
