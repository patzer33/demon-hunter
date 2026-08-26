// Todas as variáveis de balanceamento ficam aqui, num só lugar.
const CONFIG = {
  sprite: {
    baseSize: 48, // dimensão-base dos sprites principais do jogo (personagem, inimigos, pistola, katana)
  },
  player: {
    speed: 220,
    maxHp: 100,
    spriteScale: 4.5, // multiplicador visual do sprite do corpo (radius * spriteScale) — colisão continua em radius
    walkFrameDuration: 0.15, // segundos que cada quadro de caminhada fica na tela
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
  paused: false,

  spawnTimer: 0,

  // Estado do sistema de ondas.
  waveEnemiesTotal: 0,     // quantos inimigos essa onda precisa spawnar no total
  waveEnemiesSpawned: 0,   // quantos já nasceram até agora
  waveMaxSimultaneous: 0,  // teto de inimigos vivos ao mesmo tempo, nessa onda
  waveInTransition: false, // true durante a pausa entre uma onda e a próxima
  waveTransitionTimer: 0,
  waveMessage: '',

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
    this.paused = false;

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

  // Prepara o estado para a onda indicada e libera o spawn imediatamente.
  startWave(waveNumber) {
    this.wave = waveNumber;

    const params = this.computeWaveParams(waveNumber);
    this.waveEnemiesTotal = params.total;
    this.waveMaxSimultaneous = params.maxSimultaneous;
    this.waveEnemiesSpawned = 0;
    this.spawnTimer = 0;

    this.waveInTransition = false;
    this.waveMessage = '';
  },

  update(dt, input, mouseWorld) {
    if (this.gameOver || this.paused) return;

    this.player.update(dt, input, mouseWorld, this.width, this.height);

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
    }

    this.updateHUD();
  },

  // Uma onda termina quando todos os inimigos previstos já nasceram e nenhum está mais vivo.
  // Ao concluir, o jogador recebe uma recompensa fixa de vida e munição antes da próxima começar.
  checkWaveCleared() {
    if (this.waveEnemiesSpawned >= this.waveEnemiesTotal && this.enemies.length === 0) {
      this.waveInTransition = true;
      this.waveTransitionTimer = CONFIG.waves.transitionTime;
      this.waveMessage = `ONDA ${this.wave + 1} COMEÇANDO...`;

      this.player.hp = Math.min(this.player.maxHp, this.player.hp + CONFIG.waveClearBonus.healthAmount);
      this.player.pistol.reserve += CONFIG.waveClearBonus.ammoAmount;
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

  draw() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false; // preserva o aspecto pixel art dos sprites (katana, futuramente pistola/personagem)
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, this.width, this.height);

    for (const enemy of this.enemies) enemy.draw(ctx);
    for (const bullet of this.bullets) bullet.draw(ctx);
    this.player.draw(ctx);

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

      ctx.textAlign = 'center';

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px sans-serif';
      ctx.fillText('PAUSADO', this.width / 2, this.height / 2 - 30);

      ctx.font = '22px sans-serif';
      ctx.fillText('Pressione ESC para continuar', this.width / 2, this.height / 2 + 15);

      ctx.fillStyle = '#d1d5db';
      ctx.fillText('Pressione R para reiniciar', this.width / 2, this.height / 2 + 45);
    }

    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.textAlign = 'center';

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 56px sans-serif';
      ctx.fillText('VOCÊ MORREU', this.width / 2, this.height / 2 - 45);

      ctx.font = '24px sans-serif';
      ctx.fillText(`PONTOS: ${this.score}`, this.width / 2, this.height / 2 + 5);

      ctx.fillStyle = '#d1d5db';
      ctx.fillText('Pressione R para jogar novamente', this.width / 2, this.height / 2 + 55);
    }
  },

  updateHUD() {
    const hp = Math.ceil(this.player.hp);
    document.getElementById('hp').textContent = `HP: ${hp}/${this.player.maxHp}`;
    document.getElementById('weapon').textContent =
      `ARMA: ${this.player.currentWeapon === 'pistol' ? 'PISTOLA' : 'KATANA'}`;

    const p = this.player.pistol;
    document.getElementById('ammo').textContent = p.reloading
      ? 'PISTOLA: RECARREGANDO...'
      : `PISTOLA: ${p.ammo}/${p.magazineSize}`;
    document.getElementById('reserve').textContent = `RESERVA: ${p.reserve}`;
    document.getElementById('wave').textContent = `ONDA: ${this.wave}`;
    document.getElementById('score').textContent = `PONTOS: ${this.score}`;
  },
};
