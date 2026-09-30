/**
 * agy-solitaire: Alternating Victory Celebrations
 * Win 1: Classic Klondike Card Cascade -> Double Happiness (囍) Modal (4.7s)
 * Win 2: 9 Auspicious Lanterns (久, eternity) + 20s Pure Imperial Gold Fireworks
 */

class SolitaireCelebration {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.animId = null;
    this.modalTimeout = null;
    this.container = null;
    this.lanternContainer = null;
    this.lastWinType = parseInt(localStorage.getItem('agy_solitaire_last_win') || '0', 10);
  }

  init(containerEl) {
    this.container = containerEl;
    this.canvas = containerEl.querySelector('#victory-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
    this.lanternContainer = containerEl.querySelector('#victory-lanterns');
  }

  resizeCanvas() {
    if (this.canvas && this.container) {
      this.canvas.width = this.container.clientWidth;
      this.canvas.height = this.container.clientHeight;
    }
  }

  stop() {
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this.modalTimeout) clearTimeout(this.modalTimeout);
    this.animId = null;
    this.modalTimeout = null;

    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    if (this.lanternContainer) {
      this.lanternContainer.innerHTML = '';
    }

    const modal = document.getElementById('victory-modal-overlay');
    if (modal) {
      modal.classList.remove('visible');
    }
    const banner = document.getElementById('victory-banner-overlay');
    if (banner) {
      banner.classList.remove('visible');
    }
  }

  /**
   * Main celebration trigger: alternates between Win 1 & Win 2
   */
  celebrate(stats, onPlayAgain) {
    this.stop();
    this.resizeCanvas();

    if (window.solitaireAudio) {
      window.solitaireAudio.playVictory();
    }

    // Determine alternating mode: 0 -> Win 1 (Cascade), 1 -> Win 2 (Lanterns + Gold Fireworks)
    const winMode = this.lastWinType;
    // Advance alternating cycle for next game
    this.lastWinType = (winMode + 1) % 2;
    localStorage.setItem('agy_solitaire_last_win', this.lastWinType);

    if (winMode === 0) {
      this.runCascadeCelebration(stats, onPlayAgain);
    } else {
      this.runLanternsFireworksCelebration(stats, onPlayAgain);
    }
  }

  // =========================================================================
  // WIN 1: CLASSIC KLONDIKE BOUNCING CARDS CASCADE -> 囍 MODAL (4.7s)
  // =========================================================================
  runCascadeCelebration(stats, onPlayAgain) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    this.ctx.clearRect(0, 0, width, height);

    // Foundation start positions (approximate top-right area)
    const startPositions = [
      width * 0.48,
      width * 0.62,
      width * 0.76,
      width * 0.90
    ];

    const cards = [];
    for (let f = 0; f < 4; f++) {
      for (let i = 0; i < 13; i++) {
        cards.push({
          x: startPositions[f],
          y: 60,
          vx: (Math.random() - 0.5) * 6 - (f > 1 ? 1 : -1),
          vy: -(Math.random() * 3 + 1.2),
          gravity: 0.28,
          bounce: 0.76,
          width: 46,
          height: 64,
          isRed: f === 1 || f === 3,
          delay: (f * 13 + i) * 6,
          active: false,
          rank: ['K','Q','J','10','9','8','7','6','5','4','3','2','A'][i]
        });
      }
    }

    let frameCount = 0;
    const ctx = this.ctx;

    const render = () => {
      frameCount++;
      cards.forEach(c => {
        if (frameCount > c.delay) c.active = true;
        if (!c.active) return;

        c.vy += c.gravity;
        c.x += c.vx;
        c.y += c.vy;

        // Bounce off floor
        if (c.y + c.height > height) {
          c.y = height - c.height;
          c.vy = -c.vy * c.bounce;
          c.vx *= 0.98;
        }

        // Bounce off walls
        if (c.x < 0) {
          c.x = 0;
          c.vx = -c.vx * 0.8;
        } else if (c.x + c.width > width) {
          c.x = width - c.width;
          c.vx = -c.vx * 0.8;
        }

        // Draw Card Stamp
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.roundRect(c.x, c.y, c.width, c.height, 4);
        ctx.fill();
        ctx.stroke();

        // Header
        ctx.fillStyle = c.isRed ? '#fee2e2' : '#f1f5f9';
        ctx.fillRect(c.x + 1, c.y + 1, c.width - 2, 18);

        // Rank
        ctx.font = '800 13.5px Lexend, -apple-system, sans-serif';
        ctx.fillStyle = c.isRed ? '#c62828' : '#111111';
        ctx.fillText(c.rank, c.x + 4, c.y + 14);

        ctx.restore();
      });

      if (frameCount < 430) {
        this.animId = requestAnimationFrame(render);
      }
    };
    render();

    // Show Win 1 Double Happiness full modal at ~4.7s
    this.modalTimeout = setTimeout(() => {
      this.showWin1Modal(stats, onPlayAgain);
    }, 4700);
  }

  // =========================================================================
  // WIN 2: 9 AUSPICIOUS SKY LANTERNS + 20s PURE IMPERIAL GOLD FIREWORKS
  // =========================================================================
  runLanternsFireworksCelebration(stats, onPlayAgain) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    this.ctx.clearRect(0, 0, width, height);

    // 1. Spawn 9 Auspicious Sky Lanterns (久, gau2, eternity / long life)
    if (this.lanternContainer) {
      this.lanternContainer.innerHTML = '';
      const chars = ['龍', '福', '禄', '寿', '吉', '财', '旺', '春', '和'];
      const leftPositions = [20, 80, 140, 200, 270, 320, 50, 170, 240];
      const durations = [17, 20, 22, 18, 19, 23, 18, 21, 19];
      // Release 9 lanterns across 5.2 seconds (cadence ~0.65s)
      const delays = [0, 0.65, 1.3, 1.95, 2.6, 3.25, 3.9, 4.55, 5.2];
      const animations = ['floatUpGentle', 'floatUpSwayRight', 'floatUpSwayLeft'];
      const sizes = ['medium', 'large', 'small', 'medium', 'large', 'small', 'medium', 'small', 'medium'];

      for (let i = 0; i < 9; i++) {
        const div = document.createElement('div');
        div.className = `dyn-lantern ${sizes[i]}`;
        div.style.left = `${leftPositions[i]}px`;
        div.style.animation = `${animations[i % 3]} ${durations[i]}s linear ${delays[i]}s infinite both, lanternFlicker 3s ease-in-out ${delays[i]}s infinite both`;
        div.textContent = chars[i];
        this.lanternContainer.appendChild(div);
      }
    }

    // 2. 20-Second Pure Imperial Gold Fireworks Engine
    const sparks = [];
    const bursts = [
      { x: 85, y: 150, delay: 0 },
      { x: 305, y: 170, delay: 70 },
      { x: 195, y: 110, delay: 150 },
      { x: 110, y: 280, delay: 230 },
      { x: 280, y: 300, delay: 310 },
      { x: 195, y: 200, delay: 390 },
      { x: 90, y: 160, delay: 470 },
      { x: 300, y: 190, delay: 550 },
      { x: 195, y: 130, delay: 630 },
      { x: 130, y: 320, delay: 710 },
      { x: 260, y: 310, delay: 790 },
      { x: 95, y: 180, delay: 870 },
      { x: 295, y: 160, delay: 950 },
      { x: 195, y: 220, delay: 1030 },
      { x: 140, y: 140, delay: 1100 },
      { x: 250, y: 130, delay: 1115 }
    ];
    const colors = ['#fbbf24', '#fef08a', '#fde047', '#f59e0b', '#fef9c3', '#d97706'];
    let fCount = 0;
    const ctx = this.ctx;

    const render = () => {
      fCount++;
      bursts.forEach(b => {
        if (fCount === b.delay) {
          for (let i = 0; i < 48; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3.8 + 1;
            sparks.push({
              x: b.x,
              y: b.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              color: colors[Math.floor(Math.random() * colors.length)],
              alpha: 1,
              size: Math.random() * 3 + 1.5,
              decay: Math.random() * 0.016 + 0.01,
              gravity: 0.03
            });
          }
        }
      });

      ctx.clearRect(0, 0, width, height);

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += s.gravity;
        s.alpha -= s.decay;

        if (s.alpha <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (fCount < 1200 || sparks.length > 0) {
        this.animId = requestAnimationFrame(render);
      }
    };
    render();

    // Show Win 2 compact banner modal 3 seconds after all 9 lanterns have appeared (5.2s + 3.0s = 8.2s)
    this.modalTimeout = setTimeout(() => {
      this.showWin2Banner(stats, onPlayAgain);
    }, 8200);
  }

  /**
   * Win 1 Modal: Fullscreen Imperial Golden Dragon Modal Overlay
   */
  showWin1Modal(stats, onPlayAgain) {
    const modal = document.getElementById('victory-modal-overlay');
    if (!modal) return;

    if (window.solitaireI18n) {
      window.solitaireI18n.applyLanguage(window.solitaireI18n.currentLang);
    }

    const timeStr = stats.time || '00:00';
    const movesStr = stats.moves || 0;
    const scoreStr = stats.score || 0;

    const timeEl = modal.querySelector('#modal-stats-time');
    if (timeEl) timeEl.textContent = timeStr;
    const movesEl = modal.querySelector('#modal-stats-moves');
    if (movesEl) movesEl.textContent = movesStr;
    const scoreEl = modal.querySelector('#modal-stats-score');
    if (scoreEl) scoreEl.textContent = scoreStr;
    const subLabel = modal.querySelector('#modal-sub-label');
    if (subLabel && window.solitaireI18n) {
      subLabel.textContent = window.solitaireI18n.t('win1_sub');
    }

    const btn = modal.querySelector('#modal-play-again-btn');
    if (btn) {
      btn.onclick = () => {
        this.stop();
        if (onPlayAgain) onPlayAgain();
      };
    }

    modal.classList.add('visible');
  }

  /**
   * Win 2 Modal: Compact Tableau Banner (does not cover full board/HUD)
   */
  showWin2Banner(stats, onPlayAgain) {
    const banner = document.getElementById('victory-banner-overlay');
    if (!banner) return;

    if (window.solitaireI18n) {
      window.solitaireI18n.applyLanguage(window.solitaireI18n.currentLang);
    }

    const timeStr = stats.time || '00:00';
    const movesStr = stats.moves || 0;
    const scoreStr = stats.score || 0;

    const timeEl = banner.querySelector('#banner-stats-time');
    if (timeEl) timeEl.textContent = timeStr;
    const movesEl = banner.querySelector('#banner-stats-moves');
    if (movesEl) movesEl.textContent = movesStr;
    const scoreEl = banner.querySelector('#banner-stats-score');
    if (scoreEl) scoreEl.textContent = scoreStr;

    const btn = banner.querySelector('#banner-play-again-btn');
    if (btn) {
      btn.onclick = () => {
        this.stop();
        if (onPlayAgain) onPlayAgain();
      };
    }

    banner.classList.add('visible');
  }

  showModal(stats, onPlayAgain, celebrationTitle) {
    this.showWin1Modal(stats, onPlayAgain);
  }
}

window.solitaireCelebration = new SolitaireCelebration();
