/**
 * agy-solitaire: Internationalization (i18n)
 * Supported languages: English (en), Spanish (es), Vietnamese (vi)
 * Auto-aligns to device language on first launch, with persistent manual override in Settings.
 */

class SolitaireI18n {
  constructor() {
    this.currentLang = 'en';
    this.translations = {
      en: {
        // Header
        btn_new: 'New',
        btn_menu: 'Menu',
        btn_undo: 'Undo',
        btn_help_title: 'How to Play',

        // Bottom HUD
        stat_score: 'Score',
        stat_moves: 'Moves',
        stat_time: 'Time',

        // Auto-Win Banner
        auto_win_title: 'Solved!',
        auto_win_btn: 'Auto-Win →',

        // New Game Modal
        new_game_title: 'Start a New Deal?',
        new_game_desc: 'Your current deal and moves will be reset.',
        new_game_cancel: 'Cancel',
        new_game_confirm: 'Start New Deal',

        // Settings Modal
        settings_title: 'Settings',
        settings_lang_label: 'Language',
        settings_lang_hint: 'Display language',
        settings_move_label: 'Move Control',
        settings_move_hint: 'Tap card destination or auto-move',
        settings_move_manual: 'Choose Move',
        settings_move_auto: 'Single Tap',
        settings_draw_label: 'Draw Mode',
        settings_draw_hint: 'Cards dealt from stock to waste',
        settings_draw_1: 'Deal 1',
        settings_draw_3: 'Deal 3',
        settings_deal_label: 'Deal Type',
        settings_deal_hint: 'Guaranteed winnable or random deal',
        settings_deal_winning: 'Winnable',
        settings_deal_random: 'Random',
        settings_timer_label: 'Show Timer',
        settings_timer_hint: 'Display timer at bottom of screen',
        settings_sound_label: 'Sound Effects',
        settings_sound_hint: 'Tactile audio feedback on card moves',
        settings_off: 'Off',
        settings_on: 'On',
        settings_done: 'Done',

        // How to Play Modal
        help_title: 'How to Play',
        help_subtitle: 'Klondike Solitaire Quick Guide',
        help_goal_heading: 'Goal of the Game',
        help_goal_desc: 'Build all 4 foundation piles at the top from <strong>Ace up to King</strong>, sorted by suit (<span class="help-suit-gold">♠</span> <span class="help-suit-red">♥</span> <span class="help-suit-gold">♣</span> <span class="help-suit-red">♦</span>).',
        help_move_heading: 'Moving Cards (Tableau)',
        help_move_desc: '• Stack cards downward in <strong>alternating colors</strong> (e.g. Red 8 on Black 9).<br>• Empty column spaces can only be filled by a <strong>King</strong> (or a stack starting with a King).<br>• You can move single cards or full sequences of face-up cards.',
        help_stock_heading: 'Stock & Waste',
        help_stock_desc: 'Tap the top-right <strong>Stock</strong> pile to draw cards into the <strong>Waste</strong> pile. When the stock is empty, tap it again to recycle.',
        help_tips_heading: 'Helpful Tips for Mom',
        help_tips_desc: '• <strong>Aces fly automatically</strong> to the foundation when tapped!<br>• Tap <strong>Undo</strong> anytime if you want to rethink a move.<br>• Try to uncover face-down cards as early as you can.',
        help_close_btn: "Got It, Let's Play!",

        // Victory Modals
        win1_title: 'VICTORY!',
        win1_sub: 'IMPERIAL GOLDEN DRAGON',
        win1_btn: 'PLAY NEXT DEAL →',
        win2_title: 'GRAND JUBILEE!',
        win2_sub: 'Imperial Golden Dragon • 9 Auspicious Lanterns',
        win2_btn: 'Next Deal →',
        stat_moves_lbl: 'MOVES:',
        stat_score_lbl: 'SCORE:'
      },

      es: {
        // Header
        btn_new: 'Nuevo',
        btn_menu: 'Menú',
        btn_undo: 'Deshacer',
        btn_help_title: 'Cómo jugar',

        // Bottom HUD
        stat_score: 'Puntos',
        stat_moves: 'Movimientos',
        stat_time: 'Tiempo',

        // Auto-Win Banner
        auto_win_title: '¡Resuelto!',
        auto_win_btn: 'Auto-Ganar →',

        // New Game Modal
        new_game_title: '¿Nueva partida?',
        new_game_desc: 'Se reiniciará tu partida actual y tus movimientos.',
        new_game_cancel: 'Cancelar',
        new_game_confirm: 'Nueva partida',

        // Settings Modal
        settings_title: 'Ajustes',
        settings_lang_label: 'Idioma',
        settings_lang_hint: 'Idioma de la aplicación',
        settings_move_label: 'Control de juego',
        settings_move_hint: 'Toca el destino o mueve con un toque',
        settings_move_manual: 'Elegir jugada',
        settings_move_auto: 'Un toque',
        settings_draw_label: 'Modo de reparto',
        settings_draw_hint: 'Cartas repartidas del mazo al descarte',
        settings_draw_1: 'Repartir 1',
        settings_draw_3: 'Repartir 3',
        settings_deal_label: 'Tipo de partida',
        settings_deal_hint: 'Partida ganable garantizada o al azar',
        settings_deal_winning: 'Ganable',
        settings_deal_random: 'Al azar',
        settings_timer_label: 'Ver reloj',
        settings_timer_hint: 'Mostrar tiempo al pie de la pantalla',
        settings_sound_label: 'Efectos de sonido',
        settings_sound_hint: 'Sonido táctil al mover las cartas',
        settings_off: 'No',
        settings_on: 'Sí',
        settings_done: 'Listo',

        // How to Play Modal
        help_title: 'Cómo jugar',
        help_subtitle: 'Guía rápida de Solitario Klondike',
        help_goal_heading: 'Objetivo del juego',
        help_goal_desc: 'Forma las 4 pilas superiores del <strong>As al Rey</strong>, ordenadas por su palo (<span class="help-suit-gold">♠</span> <span class="help-suit-red">♥</span> <span class="help-suit-gold">♣</span> <span class="help-suit-red">♦</span>).',
        help_move_heading: 'Mover cartas (Tablero)',
        help_move_desc: '• Coloca cartas hacia abajo en <strong>colores alternos</strong> (ej. 8 rojo sobre 9 negro).<br>• Los espacios vacíos solo los puede ocupar un <strong>Rey</strong>.<br>• Puedes mover cartas individuales o secuencias completas.',
        help_stock_heading: 'Mazo y Descarte',
        help_stock_desc: 'Toca el <strong>Mazo</strong> superior derecho para sacar cartas al <strong>Descarte</strong>. Cuando se agote, tócalo para reciclarlo.',
        help_tips_heading: 'Consejos útiles para mamá',
        help_tips_desc: '• ¡Los <strong>Ases vuelan solos</strong> a la meta al tocarlos!<br>• Toca <strong>Deshacer</strong> siempre que quieras repensar un movimiento.<br>• Descubre las cartas boca abajo lo antes posible.',
        help_close_btn: '¡Entendido, a jugar!',

        // Victory Modals
        win1_title: '¡VICTORIA!',
        win1_sub: 'DRAGÓN DORADO IMPERIAL',
        win1_btn: 'SIGUIENTE PARTIDA →',
        win2_title: '¡GRAN JÚBILO!',
        win2_sub: 'Dragón Dorado Imperial • 9 Faroles Auspiciosos',
        win2_btn: 'Siguiente →',
        stat_moves_lbl: 'MOVIMIENTOS:',
        stat_score_lbl: 'PUNTOS:'
      },

      vi: {
        // Header
        btn_new: 'Ván mới',
        btn_menu: 'Menu',
        btn_undo: 'Hoàn tác',
        btn_help_title: 'Cách chơi',

        // Bottom HUD
        stat_score: 'Điểm',
        stat_moves: 'Nước đi',
        stat_time: 'Thời gian',

        // Auto-Win Banner
        auto_win_title: 'Đã giải xong!',
        auto_win_btn: 'Tự động thắng →',

        // New Game Modal
        new_game_title: 'Bắt đầu ván mới?',
        new_game_desc: 'Ván chơi hiện tại và các nước đi sẽ được đặt lại.',
        new_game_cancel: 'Hủy',
        new_game_confirm: 'Ván mới',

        // Settings Modal
        settings_title: 'Cài đặt',
        settings_lang_label: 'Ngôn ngữ',
        settings_lang_hint: 'Ngôn ngữ hiển thị giao diện',
        settings_move_label: 'Cách di chuyển',
        settings_move_hint: 'Chạm chọn đích đến hoặc một chạm',
        settings_move_manual: 'Chọn nước',
        settings_move_auto: 'Một chạm',
        settings_draw_label: 'Chế độ rút bài',
        settings_draw_hint: 'Số lá bài rút từ chồng bài ra bài lật',
        settings_draw_1: 'Rút 1 lá',
        settings_draw_3: 'Rút 3 lá',
        settings_deal_label: 'Kiểu chia bài',
        settings_deal_hint: 'Ván chắc chắn thắng hoặc chia ngẫu nhiên',
        settings_deal_winning: 'Chắc thắng',
        settings_deal_random: 'Ngẫu nhiên',
        settings_timer_label: 'Hiện đồng hồ',
        settings_timer_hint: 'Hiển thị thời gian ở cuối màn hình',
        settings_sound_label: 'Âm thanh',
        settings_sound_hint: 'Hiệu ứng âm thanh khi di chuyển bài',
        settings_off: 'Tắt',
        settings_on: 'Bật',
        settings_done: 'Xong',

        // How to Play Modal
        help_title: 'Cách chơi',
        help_subtitle: 'Hướng dẫn nhanh Solitaire Klondike',
        help_goal_heading: 'Mục tiêu trò chơi',
        help_goal_desc: 'Xếp đủ 4 ô đích ở trên cùng từ <strong>Át (A) đến K</strong>, cùng chất (<span class="help-suit-gold">♠</span> <span class="help-suit-red">♥</span> <span class="help-suit-gold">♣</span> <span class="help-suit-red">♦</span>).',
        help_move_heading: 'Di chuyển bài (Bàn cờ)',
        help_move_desc: '• Xếp bài giảm dần <strong>xen kẽ màu đỏ và đen</strong> (ví dụ: 8 đỏ trên 9 đen).<br>• Ô cột trống chỉ có thể đặt quân <strong>K</strong> (hoặc chuỗi bắt đầu bằng K).<br>• Có thể di chuyển một lá hoặc cả chuỗi bài đang ngửa.',
        help_stock_heading: 'Chồng bài & Bài lật',
        help_stock_desc: 'Chạm vào <strong>Chồng bài</strong> góc trên bên phải để rút bài. Khi hết bài, chạm lại để xào lại từ đầu.',
        help_tips_heading: 'Mẹo hữu ích cho mẹ',
        help_tips_desc: '• Quân <strong>Át tự động bay</strong> lên ô đích khi chạm vào!<br>• Chạm <strong>Hoàn tác</strong> bất cứ lúc nào nếu muốn nghĩ lại.<br>• Cố gắng lật mở các lá bài úp càng sớm càng tốt.',
        help_close_btn: 'Đã hiểu, chơi thôi!',

        // Victory Modals
        win1_title: 'CHIẾN THẮNG!',
        win1_sub: 'RỒNG VÀNG HOÀNG GIA',
        win1_btn: 'VÁN TIẾP THEO →',
        win2_title: 'ĐẠI HỶ SỰ!',
        win2_sub: 'Rồng Vàng Hoàng Gia • 9 Đèn lồng Cát tường',
        win2_btn: 'Tiếp theo →',
        stat_moves_lbl: 'NƯỚC ĐI:',
        stat_score_lbl: 'ĐIỂM:'
      }
    };
  }

  init() {
    this.currentLang = this.detectLanguage();
    this.applyLanguage(this.currentLang);
  }

  detectLanguage() {
    // 0. URL param override for testing and direct links (?lang=es, ?lang=vi, ?lang=en)
    try {
      const params = new URLSearchParams(window.location.search);
      const urlLang = params.get('lang');
      if (urlLang && this.translations[urlLang.toLowerCase()]) {
        return urlLang.toLowerCase();
      }
    } catch (e) {}

    // 1. Explicit user selection made in the game settings menu
    try {
      // Clear legacy/polluted key from review page if present
      localStorage.removeItem('agy_solitaire_lang');
      const userSelected = localStorage.getItem('agy_solitaire_user_lang');
      if (userSelected && this.translations[userSelected]) {
        return userSelected;
      }
    } catch (e) {}

    // 2. Default to English (per user specification: default to English unless chosen in menu)
    return 'en';
  }

  setLanguage(lang, persist = true) {
    if (!this.translations[lang]) return;
    this.currentLang = lang;
    const isUrlOverride = Boolean(window.location.search && window.location.search.includes('lang='));
    if (persist && !isUrlOverride) {
      try {
        localStorage.setItem('agy_solitaire_user_lang', lang);
      } catch (e) {}
    }
    this.applyLanguage(lang);
  }

  t(key) {
    const dict = this.translations[this.currentLang] || this.translations.en;
    return dict[key] || this.translations.en[key] || key;
  }

  applyLanguage(lang) {
    this.currentLang = lang;
    const dict = this.translations[lang] || this.translations.en;

    // Translate all elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key] !== undefined) {
        // If string contains HTML markup (e.g. strong tags), use innerHTML
        if (dict[key].includes('<')) {
          el.innerHTML = dict[key];
        } else {
          el.textContent = dict[key];
        }
      }
    });

    // Translate elements with data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (dict[key] !== undefined) {
        el.setAttribute('title', dict[key]);
        el.setAttribute('aria-label', dict[key]);
      }
    });

    // Update active state on language buttons in Settings modal
    ['en', 'es', 'vi'].forEach((code) => {
      const btn = document.getElementById(`btn-lang-${code}`);
      if (btn) {
        btn.classList.toggle('active', code === lang);
      }
    });
  }
}

window.solitaireI18n = new SolitaireI18n();
