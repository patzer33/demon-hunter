// Todas as variáveis de balanceamento ficam aqui, num só lugar.
const CONFIG = {
  sprite: {
    baseSize: 48, // dimensão-base dos sprites principais do jogo (personagem, inimigos, pistola, katana)
  },
  player: {
    speed: 220,
    maxHp: 100,
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
  },
  mark: {
    levels: [
      { bonus: 0.20 }, // Marca I: +20% de dano da katana
      { bonus: 0.40 }, // Marca II: +40% de dano da katana
    ],
  },
  spawn: {
    maxEnemies: 3,     // quantidade máxima de inimigos vivos ao mesmo tempo (protótipo, sem ondas ainda)
    spawnInterval: 4.0, // segundos entre cada tentativa de spawn
    edgeMargin: 40,     // quão longe da borda visível o inimigo nasce
    // Peso relativo de cada tipo ao sortear o próximo spawn (maior peso = mais comum).
    types: [
      { type: 'normal', weight: 3 },
      { type: 'fast', weight: 2 },
      { type: 'heavy', weight: 1 },
    ],
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

  spawnTimer: 0,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;

    this.player = new Player(this.width / 2, this.height / 2);
    this.enemies = [new Enemy(150, 150)];
    this.bullets = [];
    this.score = 0;
    this.gameOver = false;
    this.spawnTimer = CONFIG.spawn.spawnInterval;
  },
  restart() {
    this.init(this.canvas);
},

  update(dt, input, mouseWorld) {
    if (this.gameOver) return;

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

    this.updateSpawning(dt);

    if (!this.player.alive) this.gameOver = true;

    this.updateHUD();
  },

  // Sistema básico de spawn: mantém inimigos nascendo nas bordas até o teto configurado.
  // Ainda não é o sistema de ondas — só garante múltiplos inimigos simultâneos.
  updateSpawning(dt) {
    this.spawnTimer -= dt;

    if (this.spawnTimer <= 0) {
      this.spawnTimer = CONFIG.spawn.spawnInterval;

      if (this.enemies.length < CONFIG.spawn.maxEnemies) {
        this.spawnEnemy();
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

    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = '48px sans-serif';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.textAlign = 'center';

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 56px sans-serif';
      ctx.fillText(
          'VOCÊ MORREU',
          this.width / 2,
          this.height / 2 - 45
      );

      ctx.font = '24px sans-serif';
      ctx.fillText(
          `PONTOS: ${this.score}`,
          this.width / 2,
          this.height / 2 + 5
      );

      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#d1d5db';
      ctx.fillText(
          'Pressione R para jogar novamente',
          this.width / 2,
          this.height / 2 + 55
      );
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
