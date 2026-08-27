// Ícone de coração usado no HUD e no aviso de cura ao final de cada onda.
const heartIcon = new Image();
heartIcon.src = 'assets/images/ui/heart.png';

// Banners de texto (pixel art) usados nas telas de pausa/derrota. "Vitória" fica reservado pra
// quando existir uma condição de vitória no jogo (hoje as ondas continuam indefinidamente).
const pausadoBanner = new Image();
pausadoBanner.src = 'assets/images/ui/pausado.png';

const derrotaBanner = new Image();
derrotaBanner.src = 'assets/images/ui/derrota.png';

const vitoriaBanner = new Image();
vitoriaBanner.src = 'assets/images/ui/vitoria.png';

// Botões do menu de pausa (normal + pressionado).
const pauseButtonImages = {};
[
  ['continuar', 'assets/images/menu/buttons/btn_continuar.png'],
  ['continuarPress', 'assets/images/menu/buttons/btn_continuar_press.png'],
  ['reiniciar', 'assets/images/menu/buttons/btn_reiniciar.png'],
  ['reiniciarPress', 'assets/images/menu/buttons/btn_reiniciar_press.png'],
  ['menuPrincipal', 'assets/images/menu/buttons/btn_menu_principal.png'],
  ['menuPrincipalPress', 'assets/images/menu/buttons/btn_menu_principal_press.png'],
].forEach(([key, path]) => {
  const img = new Image();
  img.src = path;
  pauseButtonImages[key] = img;
});

// Todas as variáveis de balanceamento ficam aqui, num só lugar.
const CONFIG = {
  sprite: {
    baseSize: 48, // dimensão-base dos sprites principais do jogo (personagem, inimigos, pistola, katana)
  },
  player: {
    speed: 220,
    maxHp: 100,
    spriteScale: 4.5, // multiplicador visual do sprite do corpo (radius * spriteScale) — colisão continua em radius
    damageFlashDuration: 0.35, // duração da vinheta vermelha na tela ao tomar dano
    idleFrameCount: 9,    // quadros por direção na animação de idle
    idleFrameDuration: 0.2, // segundos por quadro (bate com os 200ms originais do GIF)
  },
  enemy: {
    radius: 18,
    maxHp: 100,
    speed: 70,
    contactDamage: 5,
    attackCooldown: 1.4,
    attackRange: 34,
    executionThreshold: 0.4,     // limite de execução = 40% do HP máximo
    emergencyRegenPercent: 0.60, // regeneração de emergência recupera 60% do HP máximo
    regenDelay: 3.0,             // segundos sem dano até a regeneração normal começar
    regenPerSecond: 8,           // HP recuperado por segundo na regeneração normal
    scoreValue: 100,
    color: '#8b5cf6',
    spriteScale: 3.5, // multiplicador visual do sprite (radius * spriteScale) — colisão continua em radius
  },
  pistol: {
    magazineSize: 12,
    reserveAmmo: 36,
    damage: 8,
    fireCooldown: 0.25,
    reloadTime: 1.5,
  },
  katana: {
    damage: 45,
    range: 70,
    arcDegrees: 100,
    attackCooldown: 0.45,
  },
  // Inimigo rápido: pouca vida, alta velocidade, dano baixo. Difícil de alcançar com a katana.
  enemyFast: {
    radius: 13,
    maxHp: 45,
    speed: 150,
    contactDamage: 4,
    attackCooldown: 0.9,
    attackRange: 30,
    executionThreshold: 0.4,
    emergencyRegenPercent: 0.60,
    regenDelay: 2.5,
    regenPerSecond: 6,
    scoreValue: 75,
    color: '#f97316',
    spriteScale: 3.5, // multiplicador visual do sprite (radius * spriteScale) — colisão continua em radius
  },
  // Inimigo pesado: muita vida, baixa velocidade, dano alto, regenera mais rápido/eficiente.
  enemyHeavy: {
    radius: 26,
    maxHp: 220,
    speed: 45,
    contactDamage: 14,
    attackCooldown: 1.6,
    attackRange: 40,
    executionThreshold: 0.4,
    emergencyRegenPercent: 0.60,
    regenDelay: 2.0,   // começa a regenerar mais rápido que o comum
    regenPerSecond: 14, // regenera mais HP por segundo que o comum
    scoreValue: 250,
    color: '#5b21b6',
    spriteScale: 5.0, // maior que os outros tipos — reforça visualmente que é mais forte/ameaçador
  },
  mark: {
    levels: [
      { bonus: 0.20 }, // Marca I: +20% de dano da katana
      { bonus: 0.40 }, // Marca II: +40% de dano da katana
    ],
  },
  spawn: {
    edgeMargin: 40,     // quão longe da borda visível o inimigo nasce
    spawnInterval: 1.0, // segundos entre cada inimigo nascendo, enquanto a onda ainda tem inimigos pra nascer
    // Peso relativo de cada tipo ao sortear o próximo spawn (maior peso = mais comum).
    types: [
      { type: 'normal', weight: 3 },
      { type: 'fast', weight: 2 },
      { type: 'heavy', weight: 1 },
    ],
  },
  waves: {
    startingEnemies: 8,   // quantidade total de inimigos na onda 1
    enemiesIncrease: 4,   // quantos inimigos a mais a cada onda nova (progressão linear e configurável)
    startingMaxSimultaneous: 3, // teto de inimigos vivos ao mesmo tempo na onda 1
    maxSimultaneousIncreasePerWave: 0.5, // aumento do teto por onda (arredondado pra baixo)
    maxSimultaneousCap: 8, // teto nunca passa disso, mesmo em ondas avançadas
    transitionTime: 2.0,  // segundos de pausa mostrando "ONDA X" antes da próxima começar
  },
  waveClearBonus: {
    healthAmount: 30, // HP recuperado ao concluir uma onda
    ammoAmount: 24,   // munição adicionada à reserva ao concluir uma onda
  },
  boss: {
    waveInterval: 5, // a cada N ondas, a onda vira uma "onda de chefe" (5, 10, 15...)
    // Cada chefe novo entra aqui como uma entrada nova; eles se revezam automaticamente
    // (o 1º confronto usa o primeiro da lista, o 2º usa o segundo, e assim por diante,
    // voltando ao início quando os tipos disponíveis acabarem).
    types: {
      boss1: {
        name: 'ARANHA DEMONÍACA',
        spriteMode: 'directional', // usa uma imagem por direção (8 no total), em vez de espelhar 1 só
        spritePaths: {
          north: 'assets/images/boss/boss1_north.png',
          'north-east': 'assets/images/boss/boss1_north-east.png',
          east: 'assets/images/boss/boss1_east.png',
          'south-east': 'assets/images/boss/boss1_south-east.png',
          south: 'assets/images/boss/boss1_south.png',
          'south-west': 'assets/images/boss/boss1_south-west.png',
          west: 'assets/images/boss/boss1_west.png',
          'north-west': 'assets/images/boss/boss1_north-west.png',
        },
        radius: 45,
        maxHp: 1200,
        speed: 55,
        contactDamage: 12,             // menor que antes — a mordida agora também aplica veneno
        attackCooldown: 1.2,
        attackRange: 55,
        executionThreshold: 0.35,      // limite de execução um pouco menor: exige mais golpes de katana
        emergencyRegenPercent: 0.50,
        regenDelay: 2.5,
        regenPerSecond: 20,
        scoreValue: 1000,
        color: '#b91c1c',
        spriteScale: 4.0,
        // Fase de fúria: abaixo desse % de HP, fica mais rápido e atira teia com mais frequência.
        enrageThreshold: 0.5,
        enrageSpeedMultiplier: 1.4,
        enrageWebIntervalMultiplier: 0.6,
        // Veneno aplicado pela mordida: dano contínuo por um tempo, além do dano direto.
        poisonDuration: 4.0,
        poisonDps: 4,
        // Teia à distância: não causa dano, mas deixa o jogador mais lento por um tempo.
        webInterval: 4.5,    // segundos entre um disparo de teia e o próximo (fora da fúria)
        webSpeed: 260,
        webRadius: 14,
        webLifetime: 3.5,          // some sozinha se não acertar ninguém
        webSlowDuration: 2.5,
        webSlowMultiplier: 0.45,   // velocidade do jogador cai pra 45% enquanto atolado na teia
      },
    },
  },
};

const Game = {
  canvas: null,
  ctx: null,
  width: 0,
  height: 0,

  player: null,
  enemies: [],
  bullets: [],

  score: 0,
  wave: 1,
  gameOver: false,
  victory: false, // reservado: nenhuma condição de vitória existe ainda (ondas continuam infinitamente)
  paused: false,

  spawnTimer: 0,

  // Estado do sistema de ondas.
  waveEnemiesTotal: 0,     // quantos inimigos essa onda precisa spawnar no total
  waveEnemiesSpawned: 0,   // quantos já nasceram até agora
  waveMaxSimultaneous: 0,  // teto de inimigos vivos ao mesmo tempo, nessa onda
  waveInTransition: false, // true durante a pausa entre uma onda e a próxima
  waveTransitionTimer: 0,
  waveMessage: '',
  isBossWave: false,

  healBonusPopupTimer: 0,
  healBonusPopupDuration: 1.6,
  healBonusPopupAmount: 0,

  pauseHoveredAction: null,
  pauseSubScreen: null, // null | 'controls' | 'settings' — sub-telas abertas de dentro da pausa
  endScreenHoveredAction: null, // hover dos botões da tela de Derrota/Vitória

  // Definido por main.js: chamado quando o botão "Menu Principal" da pausa é clicado.
  onReturnToMenu: null,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;

    this.player = new Player(this.width / 2, this.height / 2);
    this.enemies = [];
    this.bullets = [];
    this.score = 0;
    this.gameOver = false;
    this.victory = false;
    this.paused = false;
    this.pauseSubScreen = null;

    this.startWave(1);
  },

  // Reinicia a partida do zero (chamado ao apertar R na tela de Game Over).
  restart() {
    this.init(this.canvas);
  },

  // Calcula quantos inimigos e qual o teto simultâneo para uma dada onda, a partir do CONFIG.
  computeWaveParams(waveNumber) {
    const w = CONFIG.waves;
    const total = w.startingEnemies + w.enemiesIncrease * (waveNumber - 1);
    const maxSimultaneous = Math.min(
      w.maxSimultaneousCap,
      w.startingMaxSimultaneous + Math.floor(w.maxSimultaneousIncreasePerWave * (waveNumber - 1))
    );
    return { total, maxSimultaneous };
  },

  // Escolhe qual chefe aparece num dado número de onda, revezando pela ordem cadastrada em
  // CONFIG.boss.types. Quando só existe 1 chefe, esse mesmo é usado toda vez.
  pickBossKeyForWave(waveNumber) {
    const bossKeys = Object.keys(CONFIG.boss.types);
    const encounterIndex = Math.floor(waveNumber / CONFIG.boss.waveInterval) - 1;
    return bossKeys[encounterIndex % bossKeys.length];
  },

  // Prepara o estado para a onda indicada e libera o spawn imediatamente.
  startWave(waveNumber) {
    this.wave = waveNumber;
    this.isBossWave = waveNumber % CONFIG.boss.waveInterval === 0;

    if (this.isBossWave) {
      const bossKey = this.pickBossKeyForWave(waveNumber);
      // O chefe entra sozinho, sem inimigos comuns junto — nasce já "spawnado" (1 de 1),
      // então o checkWaveCleared() de sempre já funciona sem precisar de um caso especial.
      this.enemies = [new Boss(this.width / 2, 110, bossKey)];
      this.waveEnemiesTotal = 1;
      this.waveEnemiesSpawned = 1;
      this.waveMaxSimultaneous = 1;
      Sound.playMusic('boss');
      Sound.startBossSteps();
    } else {
      const params = this.computeWaveParams(waveNumber);
      this.waveEnemiesTotal = params.total;
      this.waveMaxSimultaneous = params.maxSimultaneous;
      this.waveEnemiesSpawned = 0;
      Sound.playMusic('gameplay');
      Sound.stopBossSteps();
    }

    this.spawnTimer = 0;
    this.waveInTransition = false;
    this.waveMessage = '';
  },

  update(dt, input, mouseWorld) {
    if (this.gameOver || this.paused) return;

    this.player.update(dt, input, mouseWorld, this.width, this.height);

    if (this.healBonusPopupTimer > 0) this.healBonusPopupTimer -= dt;

    for (const enemy of this.enemies) {
      enemy.update(dt, this.player);
    }

    for (const bullet of this.bullets) {
      bullet.update(dt);
    }
    this.handleBulletCollisions();
    this.bullets = this.bullets.filter((b) => b.active && !b.isOffScreen(this.width, this.height));

    this.enemies = this.enemies.filter((e) => {
      if (!e.alive) this.score += e.scoreValue;
      return e.alive;
    });

    if (this.waveInTransition) {
      this.waveTransitionTimer -= dt;
      if (this.waveTransitionTimer <= 0) {
        this.startWave(this.wave + 1);
      }
    } else {
      this.updateSpawning(dt);
      this.checkWaveCleared();
    }

    if (!this.player.alive && !this.gameOver) {
      this.gameOver = true;
      Menu.recordScore(this.score);
      Sound.stopMusic();
      Sound.stopBossSteps();
      Sound.play('gameOver');
    }

    this.updateHUD();
  },

  // Uma onda termina quando todos os inimigos previstos já nasceram e nenhum está mais vivo.
  // Ao concluir, o jogador recebe uma recompensa fixa de vida e munição antes da próxima começar.
  checkWaveCleared() {
    if (this.waveEnemiesSpawned >= this.waveEnemiesTotal && this.enemies.length === 0) {
      this.waveInTransition = true;
      this.waveTransitionTimer = CONFIG.waves.transitionTime;

      const nextWave = this.wave + 1;
      const nextIsBossWave = nextWave % CONFIG.boss.waveInterval === 0;
      this.waveMessage = nextIsBossWave
        ? `ONDA ${nextWave} — UM CHEFE SE APROXIMA...`
        : `ONDA ${nextWave} COMEÇANDO...`;

      this.player.hp = Math.min(this.player.maxHp, this.player.hp + CONFIG.waveClearBonus.healthAmount);
      this.player.pistol.reserve += CONFIG.waveClearBonus.ammoAmount;

      this.healBonusPopupTimer = this.healBonusPopupDuration;
      this.healBonusPopupAmount = CONFIG.waveClearBonus.healthAmount;
    }
  },

  // Spawna inimigos nas bordas até completar o total previsto para a onda atual,
  // respeitando o teto de inimigos simultâneos.
  updateSpawning(dt) {
    if (this.waveEnemiesSpawned >= this.waveEnemiesTotal) return;

    this.spawnTimer -= dt;

    if (this.spawnTimer <= 0) {
      this.spawnTimer = CONFIG.spawn.spawnInterval;

      if (this.enemies.length < this.waveMaxSimultaneous) {
        this.spawnEnemy();
        this.waveEnemiesSpawned++;
      }
    }
  },

  spawnEnemy() {
    const margin = CONFIG.spawn.edgeMargin;
    const side = Math.floor(Math.random() * 4); // 0=topo, 1=direita, 2=baixo, 3=esquerda
    let x;
    let y;

    switch (side) {
      case 0:
        x = Math.random() * this.width;
        y = -margin;
        break;
      case 1:
        x = this.width + margin;
        y = Math.random() * this.height;
        break;
      case 2:
        x = Math.random() * this.width;
        y = this.height + margin;
        break;
      default:
        x = -margin;
        y = Math.random() * this.height;
        break;
    }

    this.enemies.push(new Enemy(x, y, this.pickEnemyType()));
  },

  // Sorteia um tipo de inimigo respeitando os pesos definidos em CONFIG.spawn.types.
  pickEnemyType() {
    const types = CONFIG.spawn.types;
    const totalWeight = types.reduce((sum, t) => sum + t.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const entry of types) {
      roll -= entry.weight;
      if (roll <= 0) return entry.type;
    }

    return types[0].type;
  },

  handleBulletCollisions() {
    for (const bullet of this.bullets) {
      if (!bullet.active) continue;

      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;

        const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
        if (dist <= bullet.radius + enemy.radius) {
          enemy.takeDamageFromPistol(bullet.damage);
          bullet.active = false;
          break;
        }
      }
    }
  },

  // Barra de vida grande no topo da tela, exibida enquanto o chefe da onda estiver vivo.
  drawBossHealthBar(ctx) {
    if (!this.isBossWave) return;

    const boss = this.enemies.find((e) => e.isBoss);
    if (!boss) return;

    const barW = 520;
    const barH = 22;
    const barX = this.width / 2 - barW / 2;
    const barY = 24;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(boss.name, this.width / 2, barY - 8);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX - 4, barY - 4, barW + 8, barH + 8);

    ctx.fillStyle = '#3f0d0d';
    ctx.fillRect(barX, barY, barW, barH);

    const ratio = boss.hp / boss.maxHp;
    ctx.fillStyle = boss.enraged ? '#f97316' : '#dc2626';
    ctx.fillRect(barX, barY, barW * ratio, barH);

    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, barH);
  },

  // Vinheta vermelha nas bordas da tela, piscando brevemente sempre que o jogador toma dano.
  drawDamageVignette(ctx) {
    const timer = this.player.damageFlashTimer;
    if (timer <= 0) return;

    const alpha = Math.min(0.5, (timer / CONFIG.player.damageFlashDuration) * 0.5);
    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, this.height * 0.35,
      this.width / 2, this.height / 2, this.height * 0.75
    );
    gradient.addColorStop(0, 'rgba(220, 38, 38, 0)');
    gradient.addColorStop(1, `rgba(220, 38, 38, ${alpha})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  },

  // Coraçãozinho + "+HP" flutuando sobre o jogador quando ele ganha vida ao concluir uma onda.
  drawHealBonusPopup(ctx) {
    if (this.healBonusPopupTimer <= 0) return;

    const progress = 1 - this.healBonusPopupTimer / this.healBonusPopupDuration;
    const alpha = this.healBonusPopupTimer / this.healBonusPopupDuration;
    const riseOffset = progress * 24;

    const px = this.player.x;
    const py = this.player.y - 55 - riseOffset;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (heartIcon.complete && heartIcon.naturalWidth > 0) {
      ctx.drawImage(heartIcon, px - 34, py - 9, 18, 18);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`+${this.healBonusPopupAmount} HP`, px - 12, py + 6);

    ctx.restore();
    ctx.textAlign = 'center'; // restaura o padrão usado no resto do HUD desenhado no canvas
  },

  // Botões da tela de Derrota/Vitória: Reiniciar + Menu Principal, lado a lado.
  // Reaproveita as mesmas imagens já carregadas pro menu de pausa.
  getEndScreenButtons() {
    const btnW = 240;
    const btnH = 62;
    const gap = 20;
    const y = this.height / 2 + 90;
    const totalW = btnW * 2 + gap;
    const startX = this.width / 2 - totalW / 2;

    return [
      { x: startX, y, w: btnW, h: btnH, action: 'restart', normalImg: pauseButtonImages.reiniciar, pressImg: pauseButtonImages.reiniciarPress },
      { x: startX + btnW + gap, y, w: btnW, h: btnH, action: 'mainMenu', normalImg: pauseButtonImages.menuPrincipal, pressImg: pauseButtonImages.menuPrincipalPress },
    ];
  },

  findEndScreenButtonAt(x, y) {
    for (const btn of this.getEndScreenButtons()) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) return btn;
    }
    return null;
  },

  handleEndScreenMouseMove(x, y) {
    const btn = this.findEndScreenButtonAt(x, y);
    this.endScreenHoveredAction = btn ? btn.action : null;
  },

  handleEndScreenClick(x, y) {
    const btn = this.findEndScreenButtonAt(x, y);
    if (!btn) return;

    Sound.play('uiClick');

    if (btn.action === 'restart') {
      this.restart();
    } else if (btn.action === 'mainMenu') {
      this.gameOver = false;
      this.victory = false;
      if (this.onReturnToMenu) this.onReturnToMenu();
    }
  },

  drawEndScreenButtons(ctx) {
    for (const btn of this.getEndScreenButtons()) {
      const hovered = this.endScreenHoveredAction === btn.action;
      const img = hovered && btn.pressImg ? btn.pressImg : btn.normalImg;

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, btn.x, btn.y, btn.w, btn.h);
      }
    }
  },

  // Posições dos botões do menu de pausa. Se uma sub-tela (Controles/Configurações) estiver
  // aberta, retorna só o botão de voltar; senão, as 5 opções principais empilhadas e centralizadas.
  getPauseButtons() {
    const centerX = this.width / 2;

    if (this.pauseSubScreen) {
      return [{ x: centerX - 100, y: this.height - 110, w: 200, h: 56, label: 'VOLTAR', action: 'pauseBack' }];
    }

    const btnW = 260;
    const btnH = 65;
    const gap = 8;

    // Controles e Configurações reaproveitam a mesma arte já usada no menu principal
    // (Menu.images), sem precisar duplicar o carregamento da imagem.
    const defs = [
      { action: 'resume', normalImg: pauseButtonImages.continuar, pressImg: pauseButtonImages.continuarPress },
      { action: 'controls', normalImg: Menu.images.btnControles, pressImg: null },
      { action: 'settings', normalImg: Menu.images.btnConfiguracoes, pressImg: null },
      { action: 'restart', normalImg: pauseButtonImages.reiniciar, pressImg: pauseButtonImages.reiniciarPress },
      { action: 'mainMenu', normalImg: pauseButtonImages.menuPrincipal, pressImg: pauseButtonImages.menuPrincipalPress },
    ];

    const startY = 300; // logo abaixo do banner "PAUSADO", mais próximo (menos espaço vazio)

    return defs.map((d, i) => ({
      x: centerX - btnW / 2,
      y: startY + i * (btnH + gap),
      w: btnW,
      h: btnH,
      action: d.action,
      normalImg: d.normalImg,
      pressImg: d.pressImg,
    }));
  },

  findPauseButtonAt(x, y) {
    for (const btn of this.getPauseButtons()) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) return btn;
    }
    return null;
  },

  handlePauseMouseMove(x, y) {
    const btn = this.findPauseButtonAt(x, y);
    this.pauseHoveredAction = btn ? btn.action : null;
  },

  handlePauseClick(x, y) {
    const btn = this.findPauseButtonAt(x, y);
    if (!btn) return;

    Sound.play('uiClick');

    if (btn.action === 'pauseBack') {
      this.pauseSubScreen = null;
    } else if (btn.action === 'resume') {
      this.paused = false;
    } else if (btn.action === 'restart') {
      this.restart();
    } else if (btn.action === 'controls') {
      this.pauseSubScreen = 'controls';
    } else if (btn.action === 'settings') {
      this.pauseSubScreen = 'settings';
    } else if (btn.action === 'mainMenu') {
      this.paused = false;
      this.pauseSubScreen = null;
      Sound.stopBossSteps();
      if (this.onReturnToMenu) this.onReturnToMenu();
    }
  },

  drawPauseButtons(ctx) {
    for (const btn of this.getPauseButtons()) {
      const hovered = this.pauseHoveredAction === btn.action;

      if (btn.label) {
        // Botão "voltar" das sub-telas: simples, sem arte própria ainda.
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
        ctx.textBaseline = 'alphabetic';
        continue;
      }

      const img = hovered && btn.pressImg ? btn.pressImg : btn.normalImg;
      const useGlow = hovered && !btn.pressImg;

      if (useGlow) {
        ctx.save();
        ctx.shadowColor = 'rgba(120, 180, 255, 0.9)';
        ctx.shadowBlur = 18;
      }

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, btn.x, btn.y, btn.w, btn.h);
      }

      if (useGlow) ctx.restore();
    }
  },

  // Conteúdo das sub-telas de Controles/Configurações abertas de dentro da pausa.
  drawPauseSubScreenContent(ctx) {
    if (this.pauseSubScreen === 'controls') {
      this.drawTextPanel(ctx, 'COMO JOGAR', [
        'WASD — Mover',
        'Mouse — Mirar',
        'Clique esquerdo — Atacar',
        '1 — Equipar pistola',
        '2 — Equipar katana',
        'R — Recarregar a pistola',
        'ESC — Pausar',
      ]);
    } else if (this.pauseSubScreen === 'settings') {
      this.drawTextPanel(ctx, 'CONFIGURAÇÕES', ['Funcionalidade indisponível']);
    }
  },

  drawTextPanel(ctx, title, lines) {
    const panelW = 480;
    const panelH = 100 + lines.length * 34;
    const panelX = this.width / 2 - panelW / 2;
    const panelY = this.height / 2 - panelH / 2 - 20;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(title, this.width / 2, panelY + 45);

    ctx.font = '19px sans-serif';
    ctx.fillStyle = '#e5e7eb';
    let ly = panelY + 88;
    for (const line of lines) {
      ctx.fillText(line, this.width / 2, ly);
      ly += 34;
    }
  },

  draw() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false; // preserva o aspecto pixel art dos sprites (katana, futuramente pistola/personagem)
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, this.width, this.height);

    for (const enemy of this.enemies) enemy.draw(ctx);
    for (const bullet of this.bullets) bullet.draw(ctx);
    this.player.draw(ctx);

    this.drawBossHealthBar(ctx);
    this.drawDamageVignette(ctx);
    this.drawHealBonusPopup(ctx);

    if (this.waveInTransition) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, this.height / 2 - 45, this.width, 70);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(this.waveMessage, this.width / 2, this.height / 2 + 5);
    }

    if (this.paused) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.fillRect(0, 0, this.width, this.height);

      if (!this.pauseSubScreen) {
        ctx.textAlign = 'center';
        if (pausadoBanner.complete && pausadoBanner.naturalWidth > 0) {
          const bw = 220;
          const bh = bw * (pausadoBanner.naturalHeight / pausadoBanner.naturalWidth);
          ctx.drawImage(pausadoBanner, this.width / 2 - bw / 2, 200, bw, bh);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 48px sans-serif';
          ctx.fillText('PAUSADO', this.width / 2, 240);
        }
      } else {
        this.drawPauseSubScreenContent(ctx);
      }

      this.drawPauseButtons(ctx);
    }

    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.textAlign = 'center';

      if (derrotaBanner.complete && derrotaBanner.naturalWidth > 0) {
        const bw = 220;
        const bh = bw * (derrotaBanner.naturalHeight / derrotaBanner.naturalWidth);
        ctx.drawImage(derrotaBanner, this.width / 2 - bw / 2, this.height / 2 - 130, bw, bh);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 56px sans-serif';
        ctx.fillText('VOCÊ MORREU', this.width / 2, this.height / 2 - 45);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = '24px sans-serif';
      ctx.fillText(`PONTOS: ${this.score}`, this.width / 2, this.height / 2 + 5);

      ctx.fillStyle = '#d1d5db';
      ctx.font = '16px sans-serif';
      ctx.fillText('(ou pressione R)', this.width / 2, this.height / 2 + 40);

      this.drawEndScreenButtons(ctx);
    }
  },

  updateHUD() {
    const hp = Math.ceil(this.player.hp);
    document.getElementById('hp-value').textContent = `${hp}/${this.player.maxHp}`;
    document.getElementById('weapon').textContent =
      `ARMA: ${this.player.currentWeapon === 'pistol' ? 'PISTOLA' : 'KATANA'}`;

    const p = this.player.pistol;
    document.getElementById('ammo-value').textContent = p.reloading
      ? 'RECARREGANDO...'
      : `${p.ammo}/${p.magazineSize}`;
    document.getElementById('reserve').textContent = `RESERVA: ${p.reserve}`;
    document.getElementById('wave').textContent = `ONDA: ${this.wave}`;
    document.getElementById('score').textContent = `PONTOS: ${this.score}`;
  },
};
