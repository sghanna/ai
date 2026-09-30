/**
 * agy-solitaire: Accessible Klondike Solitaire Engine
 * Two-Tap Targeted Move (Tap-to-Select, Tap-to-Place) & Double-Tap Auto-Move
 * Unified Stack Selection Halo (slowed 2.4s pulse) & Fluid FLIP Flight Animations
 * Built for Low-Vision, Monocular Vision, & Eye-Floater Comfort
 */

class SolitaireGame {
  constructor() {
    this.deck = [];
    this.stock = [];
    this.waste = [];
    this.foundations = { S: [], H: [], C: [], D: [] };
    this.tableau = [[], [], [], [], [], [], []];

    this.undoStack = [];
    this.moves = 0;
    this.score = 0;
    this.startTime = null;
    this.timerInterval = null;
    this.elapsedSeconds = 0;
    this.isWon = false;
    this.autoCompleting = false;

    // Winnable deals tracker: ensure first hand (and default games) are 100% winnable
    this.isFirstHand = true;
    this.winnableDealIndex = 0;

    // Two-Tap Targeted Selection State
    // Format: { pile: 'tableau'|'waste'|'foundation', colIndex, cardIndex, suit, card, cards: [] }
    this.selected = null;

    // Double-tap tracker: allows comfortable deliberate auto-move on double-tap
    this.lastTapTime = 0;
    this.lastTapCardId = null;
    this.doubleTapThreshold = 650; // 650ms accessible window for comfortable deliberate tapping

    // Animation lock to prevent race conditions during card flight
    this.isAnimating = false;

    // Game Settings (persisted to localStorage)
    this.settings = {
      lang: (window.solitaireI18n ? window.solitaireI18n.currentLang : 'en'),
      moveMode: 'manual', // 'manual' = "Choose Move" (default two-tap), 'auto' = "Single Tap"
      drawCount: 1,       // 1 (default) or 3
      showTimer: false,   // false (default) or true
      dealType: 'winning', // 'winning' (default guaranteed winnable) or 'random'
      deal3Offset: 24     // card overlap offset in pixels (default 24px)
    };

    // DOM Elements
    this.boardEl = null;
    this.stockEl = null;
    this.wasteEl = null;
    this.foundationEls = {};
    this.tableauEls = [];
    this.timerEl = null;
    this.scoreEl = null;
    this.movesEl = null;
    this.undoBtn = null;
    this.hintBtn = null;
  }

  init() {
    this.boardEl = document.getElementById('game-board');
    this.stockEl = document.getElementById('slot-stock');
    this.wasteEl = document.getElementById('slot-waste');

    for (const suit of ['S', 'H', 'C', 'D']) {
      this.foundationEls[suit] = document.getElementById(`foundation-${suit}`);
    }

    for (let i = 0; i < 7; i++) {
      this.tableauEls[i] = document.getElementById(`tableau-${i}`);
    }

    this.timerEl = document.getElementById('hud-timer');
    this.scoreEl = document.getElementById('hud-score');
    this.movesEl = document.getElementById('hud-moves');
    this.undoBtn = document.getElementById('btn-undo');
    this.hintBtn = document.getElementById('btn-hint');

    this.kingPlaceholderStyle = 'twin';
    try {
      localStorage.removeItem('agy-king-placeholder-style');
    } catch (e) {}

    // Load persisted settings
    try {
      const savedSettings = localStorage.getItem('agy-solitaire-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed && typeof parsed === 'object') {
          this.settings = Object.assign(this.settings, parsed);
        }
      }
    } catch (e) {}

    // Always synchronize settings.lang with the active i18n language (defaults strictly to English)
    if (window.solitaireI18n) {
      this.settings.lang = window.solitaireI18n.currentLang;
    }

    // Check URL parameters for fast review and testing
    try {
      if (typeof window !== 'undefined' && window.location && window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('offset')) {
          this.settings.deal3Offset = Number(urlParams.get('offset'));
        }
        if (urlParams.has('draw3')) {
          this.settings.drawCount = 3;
        }
        if (urlParams.has('random')) {
          this.settings.dealType = 'random';
        }
        if (urlParams.has('winnable')) {
          this.settings.dealType = 'winning';
        }
        if (urlParams.has('openModal')) {
          setTimeout(() => {
            const m = urlParams.get('openModal');
            if (m === 'settings') {
              const b = document.getElementById('btn-settings-toggle');
              if (b) b.click();
              if (urlParams.has('scrollBottom')) {
                const s = document.querySelector('.settings-rows');
                if (s) s.scrollTop = s.scrollHeight;
              }
            } else if (m === 'help') {
              const b = document.getElementById('btn-help-toggle');
              if (b) b.click();
              if (urlParams.has('scrollBottom')) {
                const s = document.querySelector('.help-scroll-body');
                if (s) s.scrollTop = s.scrollHeight;
              }
            }
          }, 200);
        }
        // Hardware-accelerated, buttery-smooth Web Animations API drop animation
        function dropAutoWinBanner(el, fromY = null) {
          if (!el) return;
          el.style.display = 'flex';
          el.classList.add('visible');
          el.classList.remove('glowing');

          // Cancel any existing animation cleanly
          if (el._dropAnim) {
            try { el._dropAnim.cancel(); } catch (e) {}
          }

          const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (reduceMotion || !el.animate) {
            el.style.transform = 'none';
            el.style.opacity = '1';
            el.classList.add('glowing');
            return;
          }

          const startY = fromY !== null ? fromY : `-${(window.innerHeight || 800) + 50}px`;

          el._dropAnim = el.animate([
            { transform: `translate3d(0, ${startY}, 0)`, opacity: 0, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
            { opacity: 1, offset: 0.12 },
            { transform: 'translate3d(0, 10px, 0)', offset: 0.80, easing: 'ease-in-out' },
            { transform: 'translate3d(0, -4px, 0)', offset: 0.91, easing: 'ease-in-out' },
            { transform: 'translate3d(0, 0, 0)', opacity: 1 }
          ], {
            duration: 3400,
            fill: 'forwards'
          });

          el._dropAnim.onfinish = () => {
            el.classList.add('glowing');
          };
        }

        window.dropAutoWinBanner = dropAutoWinBanner;

        window.playAutoWinDrop = function() {
          const bar = document.getElementById('auto-finish-banner');
          if (!bar) return;
          bar.style.removeProperty('animation');
          bar.style.removeProperty('transform');
          bar.style.removeProperty('opacity');
          dropAutoWinBanner(bar);
          try {
            if (window.solitaireAudio && window.solitaireAudio.playAceCelebration) {
              window.solitaireAudio.playAceCelebration();
            }
          } catch (e) {}
        };

        window.addEventListener('message', (e) => {
          if (e.data && e.data.action === 'playAutoWinDrop') {
            if (window.playAutoWinDrop) {
              window.playAutoWinDrop();
            }
          }
        });

        if (urlParams.has('showAutoWin')) {
          const mode = urlParams.get('showAutoWin');
          if (mode === 'settled') {
            setTimeout(() => {
              const bar = document.getElementById('auto-finish-banner');
              if (bar) {
                bar.style.display = 'flex';
                bar.classList.add('visible', 'glowing');
                bar.style.animation = 'none';
                bar.style.transform = 'none';
                bar.style.opacity = '1';
              }
            }, 100);
          } else {
            setTimeout(() => {
              if (window.playAutoWinDrop) {
                window.playAutoWinDrop();
              }
            }, 350);
          }
        }
      }
    } catch (e) {}

    this.applySettingsUI();
    this.setupEventListeners();
    this.startNewGame();
  }

  updateViewportHeight() {
    const vh = (window.visualViewport && window.visualViewport.height) ? window.visualViewport.height : window.innerHeight;
    const maxModalH = Math.max(280, Math.floor(vh * 0.88));
    document.documentElement.style.setProperty('--browser-height', `${vh}px`);
    document.documentElement.style.setProperty('--modal-max-height', `${maxModalH}px`);
  }

  setupEventListeners() {
    // Auto-detect browser/screen height for responsive scrolling modals
    this.updateViewportHeight();
    window.addEventListener('resize', () => this.updateViewportHeight());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.updateViewportHeight(), 100);
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => this.updateViewportHeight());
    }

    // Undo button
    if (this.undoBtn) {
      this.undoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearSelection();
        this.undo();
      });
    }

    // Hint button (if present)
    if (this.hintBtn) {
      this.hintBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.provideHint();
      });
    }

    // New Game button & Custom Styled Confirmation Modal
    const newGameBtn = document.getElementById('btn-new-game');
    const confirmModal = document.getElementById('new-game-modal-overlay');
    const confirmProceedBtn = document.getElementById('btn-confirm-new-game');
    const confirmCancelBtn = document.getElementById('btn-cancel-new-game');

    if (newGameBtn) {
      newGameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirmModal) {
          confirmModal.classList.add('visible');
        } else if (confirm('Start a new deal?')) {
          this.startNewGame();
        }
      });
    }

    if (confirmProceedBtn) {
      confirmProceedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirmModal) confirmModal.classList.remove('visible');
        this.startNewGame();
      });
    }

    if (confirmCancelBtn) {
      confirmCancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirmModal) confirmModal.classList.remove('visible');
      });
    }

    if (confirmModal) {
      confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
          confirmModal.classList.remove('visible');
        }
      });
    }

    // Audio toggle button
    const audioBtn = document.getElementById('btn-audio-toggle');
    if (audioBtn) {
      const updateAudioIcon = () => {
        const isMuted = (window.solitaireAudio && typeof window.solitaireAudio.isMuted === 'function')
          ? window.solitaireAudio.isMuted()
          : (window.solitaireAudio ? Boolean(window.solitaireAudio.muted) : false);
        if (window.getSoundIconSVG) {
          audioBtn.innerHTML = window.getSoundIconSVG(isMuted);
        } else {
          audioBtn.textContent = isMuted ? '🔇' : '🔊';
        }
        audioBtn.title = isMuted ? 'Unmute Sound' : 'Mute Sound';
      };

      updateAudioIcon();

      audioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.solitaireAudio) {
          window.solitaireAudio.toggleMute();
        }
        this.applySettingsUI();
      });
    }

    // Auto-finish banner & button (entire banner is clickable for senior accessibility)
    const autoFinishBanner = document.getElementById('auto-finish-banner');
    if (autoFinishBanner) {
      autoFinishBanner.addEventListener('click', (e) => {
        e.stopPropagation();
        this.autoComplete();
      });
    }

    // Developer & Testing shortcut: Press 'W' for alternating celebration, '1' for Win 1, '2' for Win 2, 'A' for auto-finish
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const stats = {
        time: this.formatTime(this.elapsedSeconds),
        moves: this.moves || 42,
        score: this.score || 7450
      };
      if (e.key === 'w' || e.key === 'W') {
        if (window.solitaireCelebration) {
          window.solitaireCelebration.celebrate(stats, () => this.startNewGame());
        }
      } else if (e.key === '1') {
        if (window.solitaireCelebration) {
          window.solitaireCelebration.stop();
          window.solitaireCelebration.resizeCanvas();
          window.solitaireCelebration.runCascadeCelebration(stats, () => this.startNewGame());
        }
      } else if (e.key === '2') {
        if (window.solitaireCelebration) {
          window.solitaireCelebration.stop();
          window.solitaireCelebration.resizeCanvas();
          window.solitaireCelebration.runLanternsFireworksCelebration(stats, () => this.startNewGame());
        }
      } else if (e.key === 'a' || e.key === 'A') {
        this.autoComplete();
      }
    });

    // Settings button & Settings Modal
    const settingsBtn = document.getElementById('btn-settings-toggle');
    const settingsModal = document.getElementById('settings-modal-overlay');
    const closeSettingsBtn = document.getElementById('btn-close-settings');

    if (settingsBtn && settingsModal) {
      settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.updateViewportHeight();
        this.clearSelection();
        this.applySettingsUI();
        settingsModal.classList.add('visible');
      });
    }

    if (closeSettingsBtn && settingsModal) {
      closeSettingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsModal.classList.remove('visible');
      });
    }

    if (settingsModal) {
      settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
          settingsModal.classList.remove('visible');
        }
      });

      const optButtons = settingsModal.querySelectorAll('[data-setting]');
      optButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const setting = btn.dataset.setting;
          let val = btn.dataset.val;
          if (val === 'true') val = true;
          else if (val === 'false') val = false;
          else if (setting === 'drawCount') val = parseInt(val, 10);

          if (setting === 'soundMuted') {
            if (window.solitaireAudio) {
              window.solitaireAudio.setMuted(val);
              if (!val) window.solitaireAudio.playCardPlace();
            }
          } else if (setting === 'lang') {
            this.settings.lang = val;
            if (window.solitaireI18n) {
              window.solitaireI18n.setLanguage(val);
            }
            try {
              localStorage.setItem('agy-solitaire-settings', JSON.stringify(this.settings));
            } catch (err) {}
          } else {
            this.settings[setting] = val;
            try {
              localStorage.setItem('agy-solitaire-settings', JSON.stringify(this.settings));
            } catch (err) {}
          }

          this.applySettingsUI();
          if (setting === 'drawCount') {
            this.render();
          }
          if (setting !== 'soundMuted' && window.solitaireAudio) window.solitaireAudio.playCardPlace();
        });
      });
    }

    // Help button & Help Modal
    const helpBtn = document.getElementById('btn-help-toggle');
    const helpModal = document.getElementById('help-modal-overlay');
    const closeHelpBtn = document.getElementById('btn-close-help');

    if (helpBtn && helpModal) {
      helpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.updateViewportHeight();
        this.clearSelection();
        helpModal.classList.add('visible');
      });
    }

    if (closeHelpBtn && helpModal) {
      closeHelpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        helpModal.classList.remove('visible');
      });
    }

    if (helpModal) {
      helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
          helpModal.classList.remove('visible');
        }
      });
    }

    // Unified Board Interaction Delegation
    document.addEventListener('click', (e) => this.handleBoardClick(e));

    // Window resize handler for celebration canvas
    window.addEventListener('resize', () => {
      if (window.solitaireCelebration) {
        window.solitaireCelebration.resizeCanvas();
      }
    });
  }

  applySettingsUI() {
    // Language toggle buttons
    const activeLang = this.settings.lang || (window.solitaireI18n ? window.solitaireI18n.currentLang : 'en');
    ['en', 'es', 'vi'].forEach(l => {
      const b = document.getElementById(`btn-lang-${l}`);
      if (b) b.classList.toggle('active', activeLang === l);
    });

    const isAuto = (this.settings.moveMode === 'auto');
    const btnMoveManual = document.getElementById('btn-opt-move-manual');
    const btnMoveAuto = document.getElementById('btn-opt-move-auto');
    if (btnMoveManual) btnMoveManual.classList.toggle('active', !isAuto);
    if (btnMoveAuto) btnMoveAuto.classList.toggle('active', isAuto);

    const isDeal3 = (Number(this.settings.drawCount) === 3);
    const btnDraw1 = document.getElementById('btn-opt-draw-1');
    const btnDraw3 = document.getElementById('btn-opt-draw-3');
    if (btnDraw1) btnDraw1.classList.toggle('active', !isDeal3);
    if (btnDraw3) btnDraw3.classList.toggle('active', isDeal3);

    const isWinnable = (this.settings.dealType !== 'random');
    const btnDealWinning = document.getElementById('btn-opt-deal-winning');
    const btnDealRandom = document.getElementById('btn-opt-deal-random');
    if (btnDealWinning) btnDealWinning.classList.toggle('active', isWinnable);
    if (btnDealRandom) btnDealRandom.classList.toggle('active', !isWinnable);

    const showTimer = Boolean(this.settings.showTimer);
    const btnTimerOff = document.getElementById('btn-opt-timer-off');
    const btnTimerOn = document.getElementById('btn-opt-timer-on');
    if (btnTimerOff) btnTimerOff.classList.toggle('active', !showTimer);
    if (btnTimerOn) btnTimerOn.classList.toggle('active', showTimer);

    const bottomHud = document.getElementById('bottom-hud');
    if (bottomHud) {
      bottomHud.style.display = 'flex';
    }
    const timerItem = document.getElementById('hud-timer-item');
    const timerDivider = document.getElementById('hud-timer-divider');
    if (timerItem) timerItem.style.display = showTimer ? 'flex' : 'none';
    if (timerDivider) timerDivider.style.display = showTimer ? 'inline-block' : 'none';

    const isMuted = (window.solitaireAudio && typeof window.solitaireAudio.isMuted === 'function')
      ? window.solitaireAudio.isMuted()
      : false;
    const btnSoundOff = document.getElementById('btn-opt-sound-off');
    const btnSoundOn = document.getElementById('btn-opt-sound-on');
    if (btnSoundOff) btnSoundOff.classList.toggle('active', isMuted);
    if (btnSoundOn) btnSoundOn.classList.toggle('active', !isMuted);

    const audioBtn = document.getElementById('btn-audio-toggle');
    if (audioBtn) {
      if (window.getSoundIconSVG) {
        audioBtn.innerHTML = window.getSoundIconSVG(isMuted);
      } else {
        audioBtn.textContent = isMuted ? '🔇' : '🔊';
      }
      audioBtn.title = isMuted ? 'Unmute Sound' : 'Mute Sound';
    }
  }

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.isWon && !this.autoCompleting) {
        this.elapsedSeconds++;
        this.updateTimerDisplay();
      }
    }, 1000);
    if (this.timerInterval && typeof this.timerInterval.unref === 'function') {
      this.timerInterval.unref();
    }
  }

  startNewGame(forceRandom = false) {
    this.isWon = false;
    this.autoCompleting = false;
    this.isAnimating = false;
    this.lastTapTime = 0;
    this.lastTapCardId = null;
    this.clearSelection();
    this.undoStack = [];
    this.moves = 0;
    this.score = 0;
    this.elapsedSeconds = 0;

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = null;
    this.startTime = Date.now();
    this.startTimer();
    this.updateTimerDisplay();

    if (window.solitaireCelebration) {
      window.solitaireCelebration.stop();
    }

    const autoFinishBar = document.getElementById('auto-finish-banner');
    if (autoFinishBar) {
      if (window.location.search.includes('showAutoWin=settled')) {
        autoFinishBar.style.display = 'flex';
        autoFinishBar.classList.add('visible', 'glowing');
        autoFinishBar.style.animation = 'none';
        autoFinishBar.style.transform = 'none';
        autoFinishBar.style.opacity = '1';
      } else if (!window.location.search.includes('showAutoWin')) {
        if (autoFinishBar._dropAnim) {
          try { autoFinishBar._dropAnim.cancel(); } catch (e) {}
        }
        autoFinishBar.style.display = 'none';
        autoFinishBar.classList.remove('visible', 'glowing');
      }
    }

    // 1. Deal selection: the first hand is ALWAYS guaranteed winnable.
    // Subsequent hands follow settings.dealType ('winning' vs 'random').
    const useWinnable = !forceRandom && (this.isFirstHand || this.settings.dealType === 'winning');

    if (useWinnable && window.SolitaireDeck && window.SolitaireDeck.createWinnableDeck) {
      this.deck = window.SolitaireDeck.createWinnableDeck(this.winnableDealIndex);
      if (window.SolitaireDeck.WINNABLE_DEALS && window.SolitaireDeck.WINNABLE_DEALS.length > 0) {
        this.winnableDealIndex = (this.winnableDealIndex + 1) % window.SolitaireDeck.WINNABLE_DEALS.length;
      }
    } else {
      // Create fresh standard 52-card deck
      this.deck = window.SolitaireDeck.createStandardDeck();
      // Fisher-Yates Shuffle
      for (let i = this.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
      }
    }
    this.isFirstHand = false;

    // 3. Clear all piles
    this.stock = [];
    this.waste = [];
    this.foundations = { S: [], H: [], C: [], D: [] };
    this.tableau = [[], [], [], [], [], [], []];

    // 4. Deal into Tableau columns (col 0: 1 card, col 1: 2 cards ... col 6: 7 cards)
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = this.deck.pop();
        // Top card of each column is face-up
        card.faceUp = (row === col);
        this.tableau[col].push(card);
      }
    }

    // 5. Remaining 24 cards go to Stock (face down)
    while (this.deck.length > 0) {
      const card = this.deck.pop();
      card.faceUp = false;
      this.stock.push(card);
    }

    if (window.solitaireAudio) {
      window.solitaireAudio.playCardPlace();
    }

    this.render();
    this.updateHUD();
  }

  // =========================================================================
  // TWO-TAP TARGETED SELECTION & UNIFIED STACK HALO
  // =========================================================================

  clearSelection() {
    if (this.selected) {
      for (const card of this.selected.cards) {
        const el = document.getElementById(card.id);
        if (el) {
          el.classList.remove('selected-card');
          el.classList.remove('selected-stack-card');
        }
      }
      this.selected = null;
    }

    // Remove active continuous perimeter halo
    const existingHalo = document.getElementById('active-selection-halo');
    if (existingHalo) existingHalo.remove();

    // Clear empty column King guides
    document.querySelectorAll('.tableau-col.valid-king-target').forEach(col => {
      col.classList.remove('valid-king-target');
    });
  }

  setSelection(location) {
    this.clearSelection();

    let movingCards = [];
    if (location.pile === 'waste') {
      movingCards = [location.card];
    } else if (location.pile === 'foundation') {
      movingCards = [location.card];
    } else if (location.pile === 'tableau') {
      // In tableau, selecting a card selects the entire stack from cardIndex down
      movingCards = this.tableau[location.colIndex].slice(location.cardIndex);
    }

    this.selected = {
      pile: location.pile,
      colIndex: location.colIndex,
      cardIndex: location.cardIndex,
      suit: location.suit,
      card: location.card,
      cards: movingCards
    };

    // Re-render so the unified perimeter halo wraps the entire stack as a single unit
    this.render();

    if (window.solitaireAudio) {
      window.solitaireAudio.playCardSelect();
    }
  }

  // =========================================================================
  // DOUBLE-TAP AUTO-MOVE ENGINE (BEST LEGAL LOCATION)
  // =========================================================================

  /**
   * Double-Tap Handler: Automatically finds and executes the best legal move for a card/stack
   */
  autoMoveCardToBestLocation(card, location) {
    if (this.isWon || this.autoCompleting || this.isAnimating) return false;

    // 1. Check Foundation first (only valid for a single top card)
    let isSingleCard = true;
    if (location.pile === 'tableau') {
      isSingleCard = (location.cardIndex === this.tableau[location.colIndex].length - 1);
    }

    if (isSingleCard) {
      const suit = card.suit;
      const fStack = this.foundations[suit];
      const topRank = fStack.length === 0 ? 0 : fStack[fStack.length - 1].rank;

      if (card.rank === topRank + 1) {
        const selected = {
          pile: location.pile,
          colIndex: location.colIndex,
          cardIndex: location.cardIndex,
          suit: suit,
          card: card,
          cards: [card]
        };
        this.clearSelection();
        this.executeMoveToFoundation(selected, suit);
        return true;
      }
    }

    // 2. Check Tableau Columns
    let movingCards = [];
    if (location.pile === 'waste') {
      movingCards = [card];
    } else if (location.pile === 'foundation') {
      movingCards = [card];
    } else if (location.pile === 'tableau') {
      movingCards = this.tableau[location.colIndex].slice(location.cardIndex);
    }

    let bestTargetCol = null;
    let bestScore = -1;

    for (let c = 0; c < 7; c++) {
      if (location.pile === 'tableau' && location.colIndex === c) continue;

      const col = this.tableau[c];
      if (col.length > 0) {
        const topCard = col[col.length - 1];
        if (topCard.faceUp && topCard.color !== card.color && topCard.rank === card.rank + 1) {
          let score = 10;
          // Prioritize moves that expose a hidden face-down card underneath
          if (location.pile === 'tableau' && location.cardIndex > 0 && !this.tableau[location.colIndex][location.cardIndex - 1].faceUp) {
            score = 25;
          }
          if (score > bestScore) {
            bestScore = score;
            bestTargetCol = c;
          }
        }
      } else if (card.rank === 13) {
        // King onto empty column
        if (location.pile === 'tableau' && location.cardIndex === 0) {
          continue; // Don't move a King already sitting at the base of an empty column
        }
        let score = 5;
        if (location.pile === 'tableau' && location.cardIndex > 0 && !this.tableau[location.colIndex][location.cardIndex - 1].faceUp) {
          score = 20; // High priority: moving King exposes hidden card
        }
        if (score > bestScore) {
          bestScore = score;
          bestTargetCol = c;
        }
      }
    }

    if (bestTargetCol !== null) {
      const selected = {
        pile: location.pile,
        colIndex: location.colIndex,
        cardIndex: location.cardIndex,
        suit: location.suit,
        card: card,
        cards: movingCards
      };
      this.clearSelection();
      this.executeMoveToTableau(selected, bestTargetCol);
      return true;
    }

    // 3. If no legal destination exists, shake the card
    const cardEl = document.getElementById(card.id);
    if (cardEl) {
      cardEl.classList.add('no-move-shake');
      setTimeout(() => cardEl.classList.remove('no-move-shake'), 260);
    }
    if (window.solitaireAudio) {
      window.solitaireAudio.playInvalidMove();
    }
    return false;
  }

  // =========================================================================
  // UNIFIED BOARD CLICK HANDLER
  // =========================================================================

  handleBoardClick(e) {
    if (this.isWon || this.autoCompleting || this.isAnimating) return;

    // Ignore clicks on HUD header, modals, or bottom timer
    if (e.target.closest('.top-hud') || e.target.closest('#auto-finish-banner') || e.target.closest('.confirm-modal-overlay') || e.target.closest('#bottom-hud')) return;

    // 1. Stock Pile Click
    const stockEl = e.target.closest('#slot-stock');
    if (stockEl) {
      this.lastTapTime = 0;
      this.lastTapCardId = null;
      this.handleStockClick();
      return;
    }

    // 2. Foundation Slot Click
    const foundEl = e.target.closest('.slot-foundation');
    if (foundEl) {
      const suit = foundEl.id.replace('foundation-', '');
      this.handleFoundationSlotClick(suit, foundEl);
      return;
    }

    // 3. Tableau Column Click
    const colEl = e.target.closest('.tableau-col');
    if (colEl) {
      const colIndex = parseInt(colEl.dataset.col, 10);
      const cardEl = e.target.closest('.solitaire-card');
      this.handleTableauClick(colIndex, colEl, cardEl);
      return;
    }

    // 4. Waste Slot Click
    const wasteEl = e.target.closest('#slot-waste');
    if (wasteEl) {
      this.handleWasteClick();
      return;
    }

    // 5. Tapped outside / empty felt: clear selection
    this.lastTapTime = 0;
    this.lastTapCardId = null;
    this.clearSelection();
  }

  handleStockClick() {
    this.clearSelection();
    this.lastTapTime = 0;
    this.lastTapCardId = null;

    if (this.stock.length > 0) {
      // Draw 1 or 3 cards based on settings.drawCount
      const drawNum = Math.min(this.stock.length, this.settings.drawCount || 1);
      const drawnCards = [];

      // Measure starting position on top of stock
      const stockCardEl = this.stockEl.querySelector('.solitaire-card');
      const startRect = stockCardEl ? stockCardEl.getBoundingClientRect() : this.stockEl.getBoundingClientRect();

      for (let i = 0; i < drawNum; i++) {
        const card = this.stock.pop();
        card.faceUp = true;
        this.waste.push(card);
        drawnCards.push(card);
      }

      this.recordMove({
        type: 'draw',
        cards: drawnCards,
        card: drawnCards[drawnCards.length - 1]
      });

      if (window.solitaireAudio) window.solitaireAudio.playStockDraw();
      this.moves++;
      this.render();
      this.updateHUD();

      // Fluid flight from Stock into Waste for the top arriving card
      const wasteCardEl = this.wasteEl.querySelector('.solitaire-card:last-of-type') || this.wasteEl.querySelector('.solitaire-card');
      if (wasteCardEl && startRect) {
        const endRect = wasteCardEl.getBoundingClientRect();
        const dx = startRect.left - endRect.left;
        const dy = startRect.top - endRect.top;

        wasteCardEl.style.transition = 'none';
        wasteCardEl.style.transform = `translate(${dx}px, ${dy}px)`;
        wasteCardEl.classList.add('flying-card');
        wasteCardEl.offsetHeight; // force reflow

        requestAnimationFrame(() => {
          wasteCardEl.style.transition = 'transform 240ms cubic-bezier(0.2, 0.85, 0.35, 1.0), box-shadow 240ms ease';
          wasteCardEl.style.transform = 'translate(0, 0)';
          setTimeout(() => {
            wasteCardEl.style.transition = '';
            wasteCardEl.style.transform = '';
            wasteCardEl.classList.remove('flying-card');
          }, 250);
        });
      }
    } else if (this.waste.length > 0) {
      // Recycle Waste back to Stock
      const recycledCards = [...this.waste];
      this.waste = [];

      while (recycledCards.length > 0) {
        const card = recycledCards.pop();
        card.faceUp = false;
        this.stock.push(card);
      }

      this.recordMove({
        type: 'recycle',
        count: this.stock.length
      });

      if (window.solitaireAudio) window.solitaireAudio.playStockDraw();
      this.moves++;
      this.render();
      this.updateHUD();
    }
  }

  handleWasteClick() {
    if (this.waste.length === 0) return;
    const topWasteCard = this.waste[this.waste.length - 1];

    // Ace auto-fly: In any mode (including two-click mode), touching an Ace flies it directly to foundation!
    if (topWasteCard.rank === 1) {
      this.clearSelection();
      this.lastTapTime = 0;
      this.lastTapCardId = null;
      this.autoMoveCardToBestLocation(topWasteCard, {
        pile: 'waste',
        cardIndex: this.waste.length - 1
      });
      return;
    }

    // Single-tap auto-move mode
    if (this.settings.moveMode === 'auto') {
      this.clearSelection();
      const moved = this.autoMoveCardToBestLocation(topWasteCard, {
        pile: 'waste',
        cardIndex: this.waste.length - 1
      });
      if (!moved) {
        this.setSelection({
          pile: 'waste',
          card: topWasteCard,
          cardIndex: this.waste.length - 1
        });
      }
      return;
    }

    // Double-tap detection on Waste card in manual mode
    const now = Date.now();
    const isDoubleTap = (this.lastTapCardId === topWasteCard.id && (now - this.lastTapTime) < this.doubleTapThreshold);

    if (isDoubleTap) {
      this.lastTapTime = 0;
      this.lastTapCardId = null;
      this.autoMoveCardToBestLocation(topWasteCard, {
        pile: 'waste',
        cardIndex: this.waste.length - 1
      });
      return;
    }

    this.lastTapTime = now;
    this.lastTapCardId = topWasteCard.id;

    // If waste card is already selected: toggle off
    if (this.selected && this.selected.pile === 'waste') {
      this.clearSelection();
      return;
    }

    // Otherwise, select it (switches selection to waste card)
    this.setSelection({
      pile: 'waste',
      card: topWasteCard,
      cardIndex: this.waste.length - 1
    });
  }

  handleFoundationSlotClick(suit, foundEl) {
    const fStack = this.foundations[suit];
    const topRank = fStack.length === 0 ? 0 : fStack[fStack.length - 1].rank;

    if (this.selected) {
      // Tap 2: Placing onto Foundation
      const card = this.selected.card;
      const isSingleCard = (this.selected.cards.length === 1);

      // Legal if single card, matching suit, and rank is exactly topRank + 1
      // If an Ace is selected, automatically route into its matching suit foundation even if tapped on another slot
      const targetSuit = (card.rank === 1 && isSingleCard) ? card.suit : suit;
      const targetStack = this.foundations[targetSuit];
      const targetTopRank = targetStack.length === 0 ? 0 : targetStack[targetStack.length - 1].rank;

      if (isSingleCard && card.suit === targetSuit && card.rank === targetTopRank + 1) {
        const selectedMove = { ...this.selected };
        this.clearSelection();
        this.lastTapTime = 0;
        this.lastTapCardId = null;
        this.executeMoveToFoundation(selectedMove, targetSuit);
      } else {
        // Illegal foundation destination: gentle shake & auditory feedback
        foundEl.classList.add('slot-shake');
        setTimeout(() => foundEl.classList.remove('slot-shake'), 260);
        if (window.solitaireAudio) window.solitaireAudio.playInvalidMove();
      }
    } else {
      // Tap 1: No card selected. If foundation has cards, check double-tap or select
      if (fStack.length > 0) {
        const topCard = fStack[fStack.length - 1];

        const now = Date.now();
        const isDoubleTap = (this.lastTapCardId === topCard.id && (now - this.lastTapTime) < this.doubleTapThreshold);

        if (isDoubleTap) {
          this.lastTapTime = 0;
          this.lastTapCardId = null;
          this.autoMoveCardToBestLocation(topCard, {
            pile: 'foundation',
            suit: suit,
            cardIndex: fStack.length - 1
          });
          return;
        }

        this.lastTapTime = now;
        this.lastTapCardId = topCard.id;

        this.setSelection({
          pile: 'foundation',
          card: topCard,
          suit: suit,
          cardIndex: fStack.length - 1
        });
      }
    }
  }

  handleTableauClick(colIndex, colEl, cardEl) {
    const col = this.tableau[colIndex];

    // -----------------------------------------------------------------------
    // A. Card element inside tableau column was clicked
    // -----------------------------------------------------------------------
    if (cardEl) {
      const cardId = cardEl.dataset.id;
      const cardIndex = col.findIndex(c => c.id === cardId);
      if (cardIndex === -1) return;
      const card = col[cardIndex];

      // A1: Face-down card
      if (!card.faceUp) {
        this.clearSelection();
        this.lastTapTime = 0;
        this.lastTapCardId = null;

        // If it's the top unrevealed card at the column head: flip it in place!
        if (cardIndex === col.length - 1) {
          card.faceUp = true;
          this.score += 5;
          this.moves++;
          this.recordMove({
            type: 'flip',
            colIndex: colIndex,
            cardIndex: cardIndex
          });
          if (window.solitaireAudio) window.solitaireAudio.playCardFlip();
          this.render();

          // Smooth in-place card turn animation
          const newEl = document.getElementById(card.id);
          if (newEl) {
            newEl.classList.add('flipping');
            setTimeout(() => newEl.classList.remove('flipping'), 230);
          }

          this.updateHUD();
          this.checkAutoCompletionReadiness();
        }
        return;
      }

      // A2: Face-up card
      // Ace auto-fly: In any mode (including two-click mode), touching an exposed Ace flies it directly to foundation!
      if (card.rank === 1 && cardIndex === col.length - 1) {
        this.clearSelection();
        this.lastTapTime = 0;
        this.lastTapCardId = null;
        this.autoMoveCardToBestLocation(card, {
          pile: 'tableau',
          colIndex: colIndex,
          cardIndex: cardIndex
        });
        return;
      }

      // Single-tap auto-move mode
      if (this.settings.moveMode === 'auto') {
        if (!this.selected) {
          const moved = this.autoMoveCardToBestLocation(card, {
            pile: 'tableau',
            colIndex: colIndex,
            cardIndex: cardIndex
          });
          if (!moved) {
            this.setSelection({
              pile: 'tableau',
              colIndex: colIndex,
              cardIndex: cardIndex,
              card: card
            });
          }
          return;
        } else {
          // If a card is already selected, check if destination column can receive selected stack
          if (this.canMoveToTableauColumn(this.selected.card, colIndex)) {
            const selectedMove = { ...this.selected };
            this.clearSelection();
            this.lastTapTime = 0;
            this.lastTapCardId = null;
            this.executeMoveToTableau(selectedMove, colIndex);
            return;
          } else {
            // Tapped another column card that cannot receive the move: auto-move this tapped card
            this.clearSelection();
            const moved = this.autoMoveCardToBestLocation(card, {
              pile: 'tableau',
              colIndex: colIndex,
              cardIndex: cardIndex
            });
            if (!moved) {
              this.setSelection({
                pile: 'tableau',
                colIndex: colIndex,
                cardIndex: cardIndex,
                card: card
              });
            }
            return;
          }
        }
      }

      // Manual Move Mode: check Double-Tap first!
      const now = Date.now();
      const isDoubleTap = (this.lastTapCardId === card.id && (now - this.lastTapTime) < this.doubleTapThreshold);

      if (isDoubleTap) {
        this.lastTapTime = 0;
        this.lastTapCardId = null;
        this.autoMoveCardToBestLocation(card, {
          pile: 'tableau',
          colIndex: colIndex,
          cardIndex: cardIndex
        });
        return;
      }

      this.lastTapTime = now;
      this.lastTapCardId = card.id;

      if (this.selected) {
        // Tapped the EXACT same card after double-tap window: toggle selection off
        if (this.selected.pile === 'tableau' && this.selected.colIndex === colIndex && this.selected.card.id === card.id) {
          this.clearSelection();
          return;
        }

        // Tapped within the SAME column: switch selection to this card
        if (this.selected.pile === 'tableau' && this.selected.colIndex === colIndex) {
          this.setSelection({
            pile: 'tableau',
            colIndex: colIndex,
            cardIndex: cardIndex,
            card: card
          });
          return;
        }

        // Tapped in a DIFFERENT column: check if this column can receive the selected card/stack!
        if (this.canMoveToTableauColumn(this.selected.card, colIndex)) {
          // Tap 2: Legal move to tableau!
          const selectedMove = { ...this.selected };
          this.clearSelection();
          this.lastTapTime = 0;
          this.lastTapCardId = null;
          this.executeMoveToTableau(selectedMove, colIndex);
        } else {
          // Column cannot receive selected card.
          // Since player clicked on a face-up card, switch selection to this clicked card!
          this.setSelection({
            pile: 'tableau',
            colIndex: colIndex,
            cardIndex: cardIndex,
            card: card
          });
        }
      } else {
        // Tap 1: No card selected: select this card & stack!
        this.setSelection({
          pile: 'tableau',
          colIndex: colIndex,
          cardIndex: cardIndex,
          card: card
        });
      }
      return;
    }

    // -----------------------------------------------------------------------
    // B. Empty space or empty column was clicked (cardEl is null)
    // -----------------------------------------------------------------------
    this.lastTapTime = 0;
    this.lastTapCardId = null;

    if (this.selected) {
      // If clicking inside the source column's empty space: deselect
      if (this.selected.pile === 'tableau' && this.selected.colIndex === colIndex) {
        this.clearSelection();
        return;
      }

      // Check if column can accept selected card (e.g. King on empty column)
      if (this.canMoveToTableauColumn(this.selected.card, colIndex)) {
        const selectedMove = { ...this.selected };
        this.clearSelection();
        this.executeMoveToTableau(selectedMove, colIndex);
      } else {
        // Illegal target: gentle shake & invalid move audio
        colEl.classList.add('slot-shake');
        setTimeout(() => colEl.classList.remove('slot-shake'), 260);
        if (window.solitaireAudio) window.solitaireAudio.playInvalidMove();
      }
    }
  }

  // =========================================================================
  // LEGALITY CHECKS
  // =========================================================================

  canMoveToTableauColumn(card, targetCol) {
    const col = this.tableau[targetCol];
    if (col.length === 0) {
      // Only Kings (rank 13) can go on empty columns
      return card.rank === 13;
    }
    const topCard = col[col.length - 1];
    return topCard.faceUp && topCard.color !== card.color && topCard.rank === card.rank + 1;
  }

  // =========================================================================
  // FLUID FLIP CARD FLIGHT ANIMATION & MOVE EXECUTION
  // =========================================================================

  /**
   * FLIP Animation: First, Last, Invert, Play
   * Calculates exact screen translation deltas and glides cards smoothly across felt
   */
  animateMove(movingCardIds, stateUpdateFn, onComplete) {
    this.isAnimating = true;

    // 1. FIRST: Capture screen coordinates for all moving cards
    const startRects = new Map();
    for (const id of movingCardIds) {
      const el = document.getElementById(id);
      if (el) {
        startRects.set(id, el.getBoundingClientRect());
      }
    }

    // 2. Perform data model updates & DOM re-render
    const result = stateUpdateFn();

    // 3. INVERT: Calculate delta from starting position to destination position
    const animItems = [];
    for (const id of movingCardIds) {
      const newEl = document.getElementById(id);
      const startRect = startRects.get(id);
      if (newEl && startRect) {
        const endRect = newEl.getBoundingClientRect();
        const dx = startRect.left - endRect.left;
        const dy = startRect.top - endRect.top;

        // Elevate parent slot/column z-index to avoid stacking clip
        const parent = newEl.closest('.tableau-col, .slot');
        if (parent) parent.style.zIndex = '60';

        newEl.style.transition = 'none';
        newEl.style.transform = `translate(${dx}px, ${dy}px) scale(1.02)`;
        newEl.classList.add('flying-card');
        animItems.push({ el: newEl, parent });
      }
    }

    // Fallback if elements not found
    if (animItems.length === 0) {
      this.isAnimating = false;
      if (onComplete) onComplete(result);
      return;
    }

    // Force browser reflow
    animItems[0].el.offsetHeight;

    // 4. PLAY: Transition to (0, 0) using smooth physical easing
    requestAnimationFrame(() => {
      animItems.forEach(({ el }) => {
        el.style.transition = 'transform 260ms cubic-bezier(0.2, 0.85, 0.35, 1.0), box-shadow 260ms ease';
        el.style.transform = 'translate(0, 0) scale(1)';
      });

      setTimeout(() => {
        animItems.forEach(({ el, parent }) => {
          el.style.transition = '';
          el.style.transform = '';
          el.classList.remove('flying-card');
          if (parent) parent.style.zIndex = '';
        });

        this.isAnimating = false;
        if (onComplete) onComplete(result);
      }, 270);
    });
  }

  executeMoveToFoundation(selected, suit) {
    const card = selected.card;
    const movingCardIds = [card.id];

    this.animateMove(movingCardIds, () => {
      let previousCardToFlip = null;

      // 1. Remove from source
      if (selected.pile === 'waste') {
        this.waste.pop();
      } else if (selected.pile === 'tableau') {
        this.tableau[selected.colIndex].pop();
        const col = this.tableau[selected.colIndex];
        // If underlying card was face-down, mark it to flip after flight completes
        if (col.length > 0 && !col[col.length - 1].faceUp) {
          previousCardToFlip = col[col.length - 1];
        }
      }

      // 2. Add to foundation
      this.foundations[suit].push(card);
      this.score += 10;
      this.moves++;

      this.recordMove({
        type: 'to_foundation',
        source: selected.pile,
        colIndex: selected.colIndex,
        card: card,
        suit: suit,
        flippedColCard: previousCardToFlip !== null
      });

      if (window.solitaireAudio) window.solitaireAudio.playFoundation(card.rank);
      this.render();
      this.updateHUD();

      // Trigger Ace Celebration when an Ace reaches its foundation spot!
      if (card.rank === 1) {
        this.triggerAceCelebration(suit);
      }

      return previousCardToFlip;
    }, (previousCardToFlip) => {
      // After moving card lands, flip the exposed face-down card in place!
      if (previousCardToFlip) {
        previousCardToFlip.faceUp = true;
        this.score += 5;
        this.render();
        const exposedEl = document.getElementById(previousCardToFlip.id);
        if (exposedEl) {
          exposedEl.classList.add('flipping');
          setTimeout(() => exposedEl.classList.remove('flipping'), 230);
        }
        if (window.solitaireAudio) window.solitaireAudio.playCardFlip();
        this.updateHUD();
      }
      this.checkWinCondition();
      this.checkAutoCompletionReadiness();
    });
  }

  /**
   * Ace Foundation Celebration (matching Mom's screenshot!)
   * Bursts 7 suit particles around the Ace and floats a glowing +20 score badge
   */
  triggerAceCelebration(suit) {
    if (window.solitaireAudio && window.solitaireAudio.playAceCelebration) {
      window.solitaireAudio.playAceCelebration();
    }

    const foundationEl = this.foundationEls[suit];
    if (!foundationEl) return;

    const container = document.getElementById('ace-celebration-container') || document.body;
    if (!container) return;
    const rect = foundationEl.getBoundingClientRect();
    const appContainer = document.getElementById('app-container');
    const appRect = appContainer ? appContainer.getBoundingClientRect() : { left: 0, top: 0 };
    const centerX = rect.left - appRect.left + rect.width / 2;
    const centerY = rect.top - appRect.top + rect.height / 2;

    const suitGlyphs = { S: '♠', H: '♥', C: '♣', D: '♦' };
    const suitColors = { S: 'black', H: 'red', C: 'black', D: 'red' };
    const glyph = suitGlyphs[suit] || '♦';
    const colorClass = suitColors[suit] || 'red';

    // 1. Burst 7 floating suit particles in an arc around the Ace card
    const burstOffsets = [
      { tx: '-32px', ty: '-24px', rot: '-28deg' },
      { tx: '32px', ty: '-26px', rot: '32deg' },
      { tx: '-40px', ty: '12px', rot: '-16deg' },
      { tx: '40px', ty: '10px', rot: '22deg' },
      { tx: '0px', ty: '-42px', rot: '12deg' },
      { tx: '-20px', ty: '-48px', rot: '-38deg' },
      { tx: '22px', ty: '-46px', rot: '42deg' }
    ];

    burstOffsets.forEach((b, idx) => {
      const p = document.createElement('div');
      p.className = `ace-particle ${colorClass}`;
      p.textContent = glyph;
      p.style.left = `${centerX}px`;
      p.style.top = `${centerY}px`;
      if (p.style && p.style.setProperty) {
        p.style.setProperty('--tx', b.tx);
        p.style.setProperty('--ty', b.ty);
        p.style.setProperty('--rot', b.rot);
      } else if (p.style) {
        p.style['--tx'] = b.tx;
        p.style['--ty'] = b.ty;
        p.style['--rot'] = b.rot;
      }
      p.style.animationDelay = `${idx * 0.03}s`;
      container.appendChild(p);
      setTimeout(() => { if (p.parentNode) p.parentNode.removeChild(p); }, 1400);
    });

  }

  executeMoveToTableau(selected, targetCol) {
    const movingCards = [...selected.cards];
    const movingCardIds = movingCards.map(c => c.id);

    this.animateMove(movingCardIds, () => {
      let previousCardToFlip = null;

      // 1. Remove from source
      if (selected.pile === 'waste') {
        this.waste.pop();
      } else if (selected.pile === 'foundation') {
        this.foundations[selected.suit].pop();
        this.score = Math.max(0, this.score - 10);
      } else if (selected.pile === 'tableau') {
        const srcCol = this.tableau[selected.colIndex];
        srcCol.splice(selected.cardIndex);
        // If underlying card was face-down, mark it to flip after flight completes
        if (srcCol.length > 0 && !srcCol[srcCol.length - 1].faceUp) {
          previousCardToFlip = srcCol[srcCol.length - 1];
        }
      }

      // 2. Add to target column
      this.tableau[targetCol].push(...movingCards);
      this.score += 5;
      this.moves++;

      this.recordMove({
        type: 'to_tableau',
        source: selected.pile,
        sourceColIndex: selected.colIndex,
        sourceCardIndex: selected.cardIndex,
        sourceSuit: selected.suit,
        targetColIndex: targetCol,
        cards: movingCards,
        flippedColCard: previousCardToFlip !== null
      });

      if (window.solitaireAudio) window.solitaireAudio.playCardPlace();
      this.render();
      this.updateHUD();

      return previousCardToFlip;
    }, (previousCardToFlip) => {
      // After moving stack lands, flip the exposed face-down card in place!
      if (previousCardToFlip) {
        previousCardToFlip.faceUp = true;
        this.score += 5;
        this.render();
        const exposedEl = document.getElementById(previousCardToFlip.id);
        if (exposedEl) {
          exposedEl.classList.add('flipping');
          setTimeout(() => exposedEl.classList.remove('flipping'), 230);
        }
        if (window.solitaireAudio) window.solitaireAudio.playCardFlip();
        this.updateHUD();
      }
      this.checkAutoCompletionReadiness();
    });
  }

  // =========================================================================
  // UNDO ENGINE (UNLIMITED, ZERO PENALTY, FLUID FLIGHT)
  // =========================================================================

  recordMove(action) {
    this.undoStack.push(action);
  }

  undo() {
    if (this.undoStack.length === 0 || this.isWon || this.autoCompleting) return;
    this.clearSelection();
    this.isAnimating = false;
    this.lastTapTime = 0;
    this.lastTapCardId = null;

    const action = this.undoStack.pop();

    if (action.type === 'draw') {
      const cards = action.cards || (action.card ? [action.card] : []);
      for (let i = cards.length - 1; i >= 0; i--) {
        const card = this.waste.pop();
        if (card) {
          card.faceUp = false;
          this.stock.push(card);
        }
      }
      if (window.solitaireAudio) window.solitaireAudio.playUndo();
      this.render();
      this.updateHUD();
    } else if (action.type === 'recycle') {
      while (this.stock.length > 0) {
        const card = this.stock.pop();
        card.faceUp = true;
        this.waste.push(card);
      }
      if (window.solitaireAudio) window.solitaireAudio.playUndo();
      this.render();
      this.updateHUD();
    } else if (action.type === 'flip') {
      this.tableau[action.colIndex][action.cardIndex].faceUp = false;
      this.score = Math.max(0, this.score - 5);
      if (window.solitaireAudio) window.solitaireAudio.playUndo();
      this.render();
      this.updateHUD();
    } else if (action.type === 'to_foundation') {
      const card = this.foundations[action.suit][this.foundations[action.suit].length - 1];
      const movingCardIds = [card.id];

      this.animateMove(movingCardIds, () => {
        this.foundations[action.suit].pop();
        this.score = Math.max(0, this.score - 10);

        if (action.flippedColCard) {
          const col = this.tableau[action.colIndex];
          if (col.length > 0) {
            col[col.length - 1].faceUp = false;
            this.score = Math.max(0, this.score - 5);
          }
        }

        if (action.source === 'waste') {
          this.waste.push(card);
        } else if (action.source === 'tableau') {
          this.tableau[action.colIndex].push(card);
        }

        if (window.solitaireAudio) window.solitaireAudio.playUndo();
        this.render();
        this.updateHUD();
      });
    } else if (action.type === 'to_tableau') {
      const count = action.cards.length;
      const movingCardIds = action.cards.map(c => c.id);

      this.animateMove(movingCardIds, () => {
        const returnedCards = this.tableau[action.targetColIndex].splice(-count);
        this.score = Math.max(0, this.score - 5);

        if (action.flippedColCard) {
          const srcCol = this.tableau[action.sourceColIndex];
          if (srcCol.length > 0) {
            srcCol[srcCol.length - 1].faceUp = false;
            this.score = Math.max(0, this.score - 5);
          }
        }

        if (action.source === 'waste') {
          this.waste.push(returnedCards[0]);
        } else if (action.source === 'foundation') {
          this.foundations[action.sourceSuit].push(returnedCards[0]);
          this.score += 10;
        } else if (action.source === 'tableau') {
          this.tableau[action.sourceColIndex].push(...returnedCards);
        }

        if (window.solitaireAudio) window.solitaireAudio.playUndo();
        this.render();
        this.updateHUD();
      });
    }

    this.checkAutoCompletionReadiness();
  }

  // =========================================================================
  // ACCESSIBLE HINT SYSTEM
  // =========================================================================

  provideHint() {
    if (this.isWon || this.autoCompleting || this.isAnimating) return;
    this.clearSelection();

    // Clear previous hints
    document.querySelectorAll('.hint-active').forEach(el => el.classList.remove('hint-active'));

    // 1. Check if any card can go to Foundation
    // Check Waste top card
    if (this.waste.length > 0) {
      const wCard = this.waste[this.waste.length - 1];
      const fStack = this.foundations[wCard.suit];
      const topRank = fStack.length === 0 ? 0 : fStack[fStack.length - 1].rank;
      if (wCard.rank === topRank + 1) {
        this.highlightCard(wCard.id);
        return;
      }
    }

    // Check Tableau top cards
    for (let c = 0; c < 7; c++) {
      const col = this.tableau[c];
      if (col.length > 0) {
        const tCard = col[col.length - 1];
        if (tCard.faceUp) {
          const fStack = this.foundations[tCard.suit];
          const topRank = fStack.length === 0 ? 0 : fStack[fStack.length - 1].rank;
          if (tCard.rank === topRank + 1) {
            this.highlightCard(tCard.id);
            return;
          }
        }
      }
    }

    // 2. Check if moving any Tableau stack reveals a hidden card
    for (let c = 0; c < 7; c++) {
      const col = this.tableau[c];
      for (let r = 0; r < col.length; r++) {
        const card = col[r];
        if (card.faceUp) {
          const revealsCard = (r > 0 && !col[r - 1].faceUp);

          for (let targetCol = 0; targetCol < 7; targetCol++) {
            if (c === targetCol) continue;
            const tCol = this.tableau[targetCol];
            if (tCol.length > 0) {
              const targetTop = tCol[tCol.length - 1];
              if (targetTop.faceUp && targetTop.color !== card.color && targetTop.rank === card.rank + 1) {
                this.highlightCard(card.id);
                this.highlightCard(targetTop.id);
                return;
              }
            } else if (card.rank === 13 && revealsCard) {
              this.highlightCard(card.id);
              return;
            }
          }
        }
      }
    }

    // 3. Check if Waste card can move to Tableau
    if (this.waste.length > 0) {
      const wCard = this.waste[this.waste.length - 1];
      for (let targetCol = 0; targetCol < 7; targetCol++) {
        const tCol = this.tableau[targetCol];
        if (tCol.length > 0) {
          const targetTop = tCol[tCol.length - 1];
          if (targetTop.faceUp && targetTop.color !== wCard.color && targetTop.rank === wCard.rank + 1) {
            this.highlightCard(wCard.id);
            this.highlightCard(targetTop.id);
            return;
          }
        } else if (wCard.rank === 13) {
          this.highlightCard(wCard.id);
          return;
        }
      }
    }

    // 4. If nothing else, highlight Stock to draw
    if (this.stock.length > 0 || this.waste.length > 0) {
      const stockCardEl = this.stockEl.querySelector('.solitaire-card') || this.stockEl;
      stockCardEl.classList.add('hint-active');
      setTimeout(() => stockCardEl.classList.remove('hint-active'), 2500);
    }
  }

  highlightCard(cardId) {
    const el = document.getElementById(cardId);
    if (el) {
      el.classList.add('hint-active');
      setTimeout(() => el.classList.remove('hint-active'), 2500);
    }
  }

  // =========================================================================
  // WIN CONDITION & AUTO-COMPLETE
  // =========================================================================

  checkAutoCompletionReadiness() {
    // If all cards in the tableau are face-up, and stock + waste are empty,
    // the game is 100% won! Display Auto-Finish button.
    if (this.stock.length === 0 && this.waste.length === 0) {
      let allFaceUp = true;
      for (let c = 0; c < 7; c++) {
        for (const card of this.tableau[c]) {
          if (!card.faceUp) {
            allFaceUp = false;
            break;
          }
        }
      }

      const autoFinishBar = document.getElementById('auto-finish-banner');
      if (allFaceUp && autoFinishBar && !this.isWon) {
        if (!autoFinishBar.classList.contains('visible')) {
          if (typeof window.playAutoWinDrop === 'function') {
            window.playAutoWinDrop();
          } else {
            autoFinishBar.style.display = 'flex';
            autoFinishBar.classList.add('visible', 'glowing');
          }
        }
      }
    }
  }

  autoComplete() {
    if (this.autoCompleting || this.isWon) return;
    this.autoCompleting = true;
    this.clearSelection();

    const autoFinishBar = document.getElementById('auto-finish-banner');
    if (autoFinishBar) {
      if (autoFinishBar._dropAnim) {
        try { autoFinishBar._dropAnim.cancel(); } catch (e) {}
      }
      autoFinishBar.style.display = 'none';
      autoFinishBar.classList.remove('visible', 'glowing');
    }

    const step = () => {
      let moved = false;
      for (let c = 0; c < 7; c++) {
        const col = this.tableau[c];
        if (col.length > 0) {
          const card = col[col.length - 1];
          const fStack = this.foundations[card.suit];
          const topRank = fStack.length === 0 ? 0 : fStack[fStack.length - 1].rank;
          if (card.rank === topRank + 1) {
            this.executeMoveToFoundation({
              pile: 'tableau',
              colIndex: c,
              card: card,
              cards: [card]
            }, card.suit);
            moved = true;
            break;
          }
        }
      }

      if (moved && !this.isWon) {
        setTimeout(step, 140);
      } else {
        this.autoCompleting = false;
      }
    };
    step();
  }

  checkWinCondition() {
    let totalInFoundations = 0;
    for (const suit in this.foundations) {
      totalInFoundations += this.foundations[suit].length;
    }

    if (totalInFoundations === 52 && !this.isWon) {
      this.isWon = true;
      if (this.timerInterval) clearInterval(this.timerInterval);

      const autoFinishBar = document.getElementById('auto-finish-banner');
      if (autoFinishBar) {
        if (autoFinishBar._dropAnim) {
          try { autoFinishBar._dropAnim.cancel(); } catch (e) {}
        }
        autoFinishBar.style.display = 'none';
        autoFinishBar.classList.remove('visible', 'glowing');
      }

      const stats = {
        time: this.formatTime(this.elapsedSeconds),
        moves: this.moves,
        score: this.score
      };

      if (window.solitaireCelebration) {
        window.solitaireCelebration.celebrate(stats, () => this.startNewGame());
      }
    }
  }

  // =========================================================================
  // RENDERING & HELPERS
  // =========================================================================

  render() {
    // Render Stock
    this.stockEl.innerHTML = '';
    if (this.stock.length > 0) {
      const topStock = this.stock[this.stock.length - 1];
      const cardEl = window.SolitaireDeck.createCardElement(topStock);
      // Stock remaining card count badge (matching Mom's screenshot!)
      const badge = document.createElement('span');
      badge.className = 'stock-count-badge';
      badge.textContent = this.stock.length;
      cardEl.appendChild(badge);
      this.stockEl.appendChild(cardEl);
      this.stockEl.classList.remove('empty-stock');
    } else {
      this.stockEl.classList.add('empty-stock');
      this.stockEl.innerHTML = `<div class="recycle-symbol">&#x21BB;</div>`;
    }

    // Render Waste
    this.wasteEl.innerHTML = '';
    if (this.waste.length > 0) {
      // In both Single Card (Deal 1) and Deal 3 modes, display up to the last 3 flipped cards fanned out
      const displayCount = Math.min(3, this.waste.length);
      const visibleCards = this.waste.slice(-displayCount);

      visibleCards.forEach((card, idx) => {
        const isTopCard = (idx === displayCount - 1);
        const cardEl = window.SolitaireDeck.createCardElement(card);

        if (displayCount > 1) {
          const offset = Number(this.settings.deal3Offset) || 24;
          const offsetPx = (idx - (displayCount - 1)) * offset;
          cardEl.style.left = `${offsetPx}px`;
          cardEl.style.zIndex = `${idx + 1}`;
          if (!isTopCard) {
            cardEl.style.pointerEvents = 'none';
          }
        } else {
          cardEl.style.left = '0px';
          cardEl.style.zIndex = '1';
        }

        if (isTopCard && this.selected && this.selected.pile === 'waste' && this.selected.card.id === card.id) {
          cardEl.classList.add('selected-stack-card');
          const halo = document.createElement('div');
          halo.className = 'stack-selection-halo';
          halo.id = 'active-selection-halo';
          halo.style.top = '-5px';
          halo.style.left = '-1px';
          halo.style.width = 'calc(100% + 2px)';
          halo.style.height = 'calc(100% + 2px)';
          halo.style.zIndex = `${displayCount + 2}`;
          this.wasteEl.appendChild(halo);
        }

        this.wasteEl.appendChild(cardEl);
      });
    }

    // Render 4 Foundations
    for (const suit of ['S', 'H', 'C', 'D']) {
      const fEl = this.foundationEls[suit];
      fEl.innerHTML = '';
      const stack = this.foundations[suit];

      if (stack.length > 0) {
        const topCard = stack[stack.length - 1];
        const cardEl = window.SolitaireDeck.createCardElement(topCard);
        if (this.selected && this.selected.pile === 'foundation' && this.selected.card.id === topCard.id) {
          cardEl.classList.add('selected-stack-card');
          const halo = document.createElement('div');
          halo.className = 'stack-selection-halo';
          halo.id = 'active-selection-halo';
          halo.style.top = '-5px';
          halo.style.left = '-1px';
          halo.style.width = 'calc(100% + 2px)';
          halo.style.height = 'calc(100% + 2px)';
          fEl.appendChild(halo);
        }
        fEl.appendChild(cardEl);
      } else {
        // Centered gold serif A placeholder matching Mom's screenshot!
        fEl.innerHTML = window.SolitaireDeck.emptyFoundationSlotSVG ? window.SolitaireDeck.emptyFoundationSlotSVG() : '<div class="foundation-empty-glyph">A</div>';
      }
    }

    // Render 7 Tableau Columns
    for (let c = 0; c < 7; c++) {
      const colEl = this.tableauEls[c];
      colEl.innerHTML = '';
      const cards = this.tableau[c];

      // Render King placeholder slot if column is empty
      if (cards.length === 0) {
        if (this.selected && this.selected.card.rank === 13) {
          colEl.classList.add('valid-king-target');
        } else {
          colEl.classList.remove('valid-king-target');
        }
        const kingPlaceholderEl = document.createElement('div');
        kingPlaceholderEl.className = 'king-placeholder-slot';
        if (this.selected && this.selected.card.rank === 13) {
          kingPlaceholderEl.classList.add('valid-king-target');
        }
        kingPlaceholderEl.title = 'King Slot';
        kingPlaceholderEl.innerHTML = window.SolitaireDeck.emptyKingSlotSVG ? 
          window.SolitaireDeck.emptyKingSlotSVG('twin') : '';
        colEl.appendChild(kingPlaceholderEl);
        continue;
      } else {
        colEl.classList.remove('valid-king-target');
      }

      let currentTopOffset = 0;
      let selectedFirstTop = null;
      let selectedLastTop = null;
      let lastSelectedCardEl = null;

      cards.forEach((card, index) => {
        const cardEl = window.SolitaireDeck.createCardElement(card);
        cardEl.style.top = `${currentTopOffset}px`;

        const isSelected = this.selected && this.selected.pile === 'tableau' &&
                           this.selected.colIndex === c &&
                           this.selected.cards.some(sc => sc.id === card.id);

        if (isSelected) {
          cardEl.classList.add('selected-stack-card');
          if (selectedFirstTop === null) selectedFirstTop = currentTopOffset;
          selectedLastTop = currentTopOffset;
          lastSelectedCardEl = cardEl;
        }

        // Generous vertical exposure: 32px for face-up cards (revealing Bodoni Q tail), 12px for face-down
        if (card.faceUp) {
          currentTopOffset += 32;
        } else {
          currentTopOffset += 12;
        }

        colEl.appendChild(cardEl);
      });

      // Append unified perimeter halo around the entire stack if selected
      if (selectedFirstTop !== null && selectedLastTop !== null) {
        const halo = document.createElement('div');
        halo.className = 'stack-selection-halo';
        halo.id = 'active-selection-halo';

        // Accurately compute card height from DOM or column aspect ratio
        let cardHeight = 78;
        if (lastSelectedCardEl && lastSelectedCardEl.offsetHeight > 0) {
          cardHeight = lastSelectedCardEl.offsetHeight;
        } else if (colEl.clientWidth > 0) {
          cardHeight = Math.round(colEl.clientWidth * (78 / 52));
        }

        const stackHeight = (selectedLastTop - selectedFirstTop) + cardHeight;
        halo.style.top = `${selectedFirstTop - 5}px`;
        halo.style.left = '-1px';
        halo.style.width = 'calc(100% + 2px)';
        halo.style.height = `${stackHeight + 2}px`;
        colEl.appendChild(halo);
      }
    }
  }

  updateHUD() {
    if (this.scoreEl) this.scoreEl.textContent = this.score;
    if (this.movesEl) this.movesEl.textContent = this.moves;
    if (this.undoBtn) {
      this.undoBtn.style.opacity = this.undoStack.length > 0 ? '1' : '0.45';
    }
  }

  updateTimerDisplay() {
    const formatted = this.formatTime(this.elapsedSeconds);
    const bottomTimer = document.getElementById('bottom-timer');
    if (bottomTimer) {
      bottomTimer.textContent = formatted;
    }
    if (this.timerEl) {
      this.timerEl.textContent = formatted;
    }
  }

  formatTime(totalSec) {
    const mins = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const secs = (totalSec % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  findCardLocation(cardId) {
    // Check Waste
    for (let i = 0; i < this.waste.length; i++) {
      if (this.waste[i].id === cardId) {
        return { pile: 'waste', cardIndex: i, card: this.waste[i] };
      }
    }

    // Check Foundations
    for (const suit in this.foundations) {
      const stack = this.foundations[suit];
      for (let i = 0; i < stack.length; i++) {
        if (stack[i].id === cardId) {
          return { pile: 'foundation', suit: suit, cardIndex: i, card: stack[i] };
        }
      }
    }

    // Check Tableau
    for (let c = 0; c < 7; c++) {
      const col = this.tableau[c];
      for (let r = 0; r < col.length; r++) {
        if (col[r].id === cardId) {
          return { pile: 'tableau', colIndex: c, cardIndex: r, card: col[r] };
        }
      }
    }

    return null;
  }
}

window.solitaireGame = new SolitaireGame();
