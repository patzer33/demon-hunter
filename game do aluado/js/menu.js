// Menu principal e telas secundárias (Controles, Recordes, Configurações).
// Desenha no mesmo canvas do jogo, mas só roda enquanto currentScreen !== 'playing' (ver main.js).
const Menu = {
  canvas: null,
  ctx: null,
  width: 0,
  height: 0,

  screen: 'main', // 'main' | 'controls' | 'records' | 'settings'
  buttons: [], // retângulos clicáveis da tela atual, recalculados em layoutButtons()
  hoveredAction: null,

  images: {},

  // Definido por main.js: chamado quando o botão "Jogar" é clicado.
  onPlay: null,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;

    this.loadImages();
    this.layoutButtons();
  },

  loadImages() {
    const paths = {
      background: 'assets/images/menu_background.png',
      btnJogar: 'assets/images/btn_jogar.png',
      btnControles: 'assets/images/btn_controles.png',
      btnRecordes: 'assets/images/btn_recordes.png',
      btnConfiguracoes: 'assets/images/btn_configuracoes.png',
      credito: 'assets/images/credito_aluado.png',
    };

    for (const key in paths) {
      const img = new Image();
      img.src = paths[key];
      this.images[key] = img;
    }
  },

  // Recalcula os botões clicáveis da tela atual. Chamado ao trocar de tela e ao redimensionar.
  layoutButtons() {
    this.buttons = [];
    const centerX = this.width / 2;

    if (this.screen === 'main') {
      const btnW = 280;
      const btnH = 70;
      const gap = 16;
      const startY = 430;

      const defs = [
        { key: 'btnJogar', action: 'play' },
        { key: 'btnControles', action: 'controls' },
        { key: 'btnRecordes', action: 'records' },
        { key: 'btnConfiguracoes', action: 'settings' },
      ];

      defs.forEach((d, i) => {
        this.buttons.push({
          x: centerX - btnW / 2,
          y: startY + i * (btnH + gap),
          w: btnW,
          h: btnH,
          imageKey: d.key,
          action: d.action,
        });
      });
    } else {
      // Telas secundárias: só um botão de voltar, embaixo.
      this.buttons.push({
        x: centerX - 100,
        y: this.height - 110,
        w: 200,
        h: 56,
        label: 'VOLTAR',
        action: 'back',
      });
    }
  },

  handleClick(x, y) {
    for (const btn of this.buttons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        this.onButtonClick(btn.action);
        return true;
      }
    }
    return false;
  },

  handleMouseMove(x, y) {
    this.hoveredAction = null;
    for (const btn of this.buttons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        this.hoveredAction = btn.action;
        return;
      }
    }
  },

  onButtonClick(action) {
    if (action === 'play') {
      if (this.onPlay) this.onPlay();
      return;
    }

    if (action === 'back') {
      this.screen = 'main';
    } else {
      this.screen = action; // 'controls' | 'records' | 'settings'
    }

    this.layoutButtons();
  },

  // Chamado pelo ESC enquanto uma tela secundária está aberta, pra voltar à principal.
  goBackToMain() {
    if (this.screen !== 'main') {
      this.screen = 'main';
      this.layoutButtons();
    }
  },

  // --- Recordes (persistidos no navegador do jogador) ---

  recordScore(score) {
    const key = 'demonHunterHighScores';
    let scores = this.getScores();

    scores.push({ score, date: new Date().toLocaleDateString('pt-BR') });
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 5);

    try {
      localStorage.setItem(key, JSON.stringify(scores));
    } catch (e) {
      // localStorage indisponível (ex: navegação privada) — ignora silenciosamente.
    }
  },

  getScores() {
    try {
      const raw = localStorage.getItem('demonHunterHighScores');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  // --- Desenho ---

  draw(ctx) {
    this.drawBackground(ctx);

    if (this.screen === 'main') {
      this.drawMainButtons(ctx);
      this.drawCredit(ctx);
    } else if (this.screen === 'controls') {
      this.drawControlsScreen(ctx);
      this.drawSecondaryButtons(ctx);
    } else if (this.screen === 'records') {
      this.drawRecordsScreen(ctx);
      this.drawSecondaryButtons(ctx);
    } else if (this.screen === 'settings') {
      this.drawSettingsScreen(ctx);
      this.drawSecondaryButtons(ctx);
    }
  },

  drawBackground(ctx) {
    const bg = this.images.background;

    if (bg.complete && bg.naturalWidth > 0) {
      // Preenche o canvas inteiro sem distorcer (estilo "cover": escala pelo maior eixo e corta o excesso).
      const scale = Math.max(this.width / bg.naturalWidth, this.height / bg.naturalHeight);
      const drawW = bg.naturalWidth * scale;
      const drawH = bg.naturalHeight * scale;
      const offsetX = (this.width - drawW) / 2;
      const offsetY = (this.height - drawH) / 2;
      ctx.drawImage(bg, offsetX, offsetY, drawW, drawH);
    } else {
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(0, 0, this.width, this.height);
    }
  },

  drawMainButtons(ctx) {
    for (const btn of this.buttons) {
      const img = this.images[btn.imageKey];
      const hovered = this.hoveredAction === btn.action;

      if (hovered) {
        ctx.save();
        ctx.shadowColor = 'rgba(120, 180, 255, 0.9)';
        ctx.shadowBlur = 18;
      }

      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, btn.x, btn.y, btn.w, btn.h);
      }

      if (hovered) ctx.restore();
    }
  },

  drawSecondaryButtons(ctx) {
    for (const btn of this.buttons) {
      const hovered = this.hoveredAction === btn.action;

      ctx.fillStyle = hovered ? 'rgba(120, 180, 255, 0.35)' : 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 1);
    }
    ctx.textBaseline = 'alphabetic'; // restaura o padrão pro resto do jogo
  },

  drawCredit(ctx) {
    const img = this.images.credito;
    if (!img.complete || img.naturalWidth === 0) return;

    const scale = 2.2;
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const margin = 22;

    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.drawImage(img, margin, this.height - h - margin, w, h);
    ctx.restore();
  },

  drawPanel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  },

  drawControlsScreen(ctx) {
    const panelW = 560;
    const panelH = 400;
    const panelX = this.width / 2 - panelW / 2;
    const panelY = 160;
    this.drawPanel(ctx, panelX, panelY, panelW, panelH);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('COMO JOGAR', this.width / 2, panelY + 50);

    const lines = [
      'WASD — Mover',
      'Mouse — Mirar',
      'Clique esquerdo — Atacar',
      '1 — Equipar pistola',
      '2 — Equipar katana',
      'R — Recarregar a pistola',
      'ESC — Pausar',
    ];

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#e5e7eb';
    let ly = panelY + 100;
    for (const line of lines) {
      ctx.fillText(line, this.width / 2, ly);
      ly += 38;
    }
  },

  drawRecordsScreen(ctx) {
    const panelW = 480;
    const panelH = 400;
    const panelX = this.width / 2 - panelW / 2;
    const panelY = 160;
    this.drawPanel(ctx, panelX, panelY, panelW, panelH);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('RECORDES', this.width / 2, panelY + 50);

    const scores = this.getScores();

    if (scores.length === 0) {
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText('Nenhum recorde ainda — jogue pra ser o primeiro!', this.width / 2, panelY + 130);
      return;
    }

    ctx.font = '22px sans-serif';
    let ly = panelY + 110;
    scores.forEach((entry, i) => {
      ctx.fillStyle = i === 0 ? '#facc15' : '#e5e7eb';
      ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}.`, panelX + 50, ly);
      ctx.fillText(`${entry.score} pontos`, panelX + 90, ly);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#9ca3af';
      ctx.font = '16px sans-serif';
      ctx.fillText(entry.date, panelX + panelW - 50, ly);
      ctx.font = '22px sans-serif';
      ly += 48;
    });
    ctx.textAlign = 'center';
  },

  drawSettingsScreen(ctx) {
    const panelW = 480;
    const panelH = 260;
    const panelX = this.width / 2 - panelW / 2;
    const panelY = 220;
    this.drawPanel(ctx, panelX, panelY, panelW, panelH);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('CONFIGURAÇÕES', this.width / 2, panelY + 60);

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('Funcionalidade indisponível', this.width / 2, panelY + 130);
  },
};
