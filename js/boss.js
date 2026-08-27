// Chefes (bosses), um a cada CONFIG.boss.waveInterval ondas (ver Game.startWave em game.js).
// Reaproveita exatamente as mesmas regras de combate dos inimigos comuns (limite de execução,
// Marca, regeneração normal e de emergência) — a diferença é vida/dano muito maiores, uma fase
// de fúria quando a vida cai, e um ataque especial (varia por tipo de chefe).
//
// O Boss implementa o mesmo "contrato" da classe Enemy (x, y, radius, alive, scoreValue,
// update(dt, player), takeDamageFromPistol/Katana, draw(ctx)), então ele pode ser colocado
// dentro de Game.enemies sem precisar mexer na colisão de bala, no ataque de katana nem no
// desenho — tudo isso já funciona genericamente por cima dessa interface.

const bossSpriteCache = {};

// Carrega (uma vez) e retorna o sprite do chefe. `variant` é usado só nos chefes com
// spriteMode: 'directional' (uma imagem por direção); nos demais, é ignorado.
function getBossSprite(bossKey, variant) {
  const cacheKey = `${bossKey}:${variant || 'default'}`;

  if (!bossSpriteCache[cacheKey]) {
    const stats = CONFIG.boss.types[bossKey];
    const img = new Image();
    img.src = stats.spriteMode === 'directional' ? stats.spritePaths[variant] : stats.spritePath;
    bossSpriteCache[cacheKey] = img;
  }

  return bossSpriteCache[cacheKey];
}

// Converte um vetor direção (dx, dy) num dos 8 setores usados pelos sprites direcionais.
const DIRECTIONS_BY_SECTOR = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];

function vectorToDirection(dx, dy) {
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  deg = (deg + 360) % 360;
  const index = Math.round(deg / 45) % 8;
  return DIRECTIONS_BY_SECTOR[index];
}

// Projétil de teia disparado pela aranha: viaja em linha reta e, ao acertar o jogador,
// aplica lentidão por um tempo em vez de dano direto.
class SpiderWeb {
  constructor(x, y, vx, vy, radius, slowDuration, slowMultiplier, lifetime) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.slowDuration = slowDuration;
    this.slowMultiplier = slowMultiplier;
    this.lifetime = lifetime;
    this.active = true;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifetime -= dt;
    if (this.lifetime <= 0) this.active = false;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(230, 230, 255, 0.85)';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

class Boss {
  constructor(x, y, bossKey) {
    const stats = CONFIG.boss.types[bossKey];

    this.isBoss = true;
    this.bossKey = bossKey;
    this.name = stats.name;

    this.x = x;
    this.y = y;
    this.radius = stats.radius;
    this.color = stats.color;
    this.scoreValue = stats.scoreValue;
    this.spriteScale = stats.spriteScale;
    this.facingLeft = false; // usado só nos chefes com spriteMode 'flip'
    this.facingDirection = 'south'; // usado só nos chefes com spriteMode 'directional'

    this.maxHp = stats.maxHp;
    this.hp = this.maxHp;
    this.speed = stats.speed;

    this.contactDamage = stats.contactDamage;
    this.attackCooldown = stats.attackCooldown;
    this.attackRange = stats.attackRange;
    this.attackTimer = 0;

    // Limite de execução: a pistola nunca reduz o HP abaixo disso (igual aos inimigos comuns).
    this.executionLimit = this.maxHp * stats.executionThreshold;
    this.emergencyRegenPercent = stats.emergencyRegenPercent;
    this.emergencyFlashTimer = 0;

    // Regeneração normal.
    this.regenDelay = stats.regenDelay;
    this.regenPerSecond = stats.regenPerSecond;
    this.timeSinceLastDamage = 0;

    // Marca aplicada pela pistola.
    this.markStacks = 0;

    this.alive = true;

    // Fase de fúria: fica mais rápido/agressivo abaixo do limiar de HP configurado.
    this.enraged = false;

    // Ataque de teia (à distância, aplica lentidão).
    this.webTimer = stats.webInterval;
    this.webs = [];
  }

  update(dt, player) {
    if (!this.alive) return;

    const stats = CONFIG.boss.types[this.bossKey];

    if (!this.enraged && this.hp <= this.maxHp * stats.enrageThreshold) {
      this.enraged = true;
    }

    const speedMultiplier = this.enraged ? stats.enrageSpeedMultiplier : 1;
    const webIntervalMultiplier = this.enraged ? stats.enrageWebIntervalMultiplier : 1;

    this.updateBehavior(dt, player, stats, speedMultiplier, webIntervalMultiplier);
    this.updateWebs(dt, player);

    this.timeSinceLastDamage += dt;
    if (this.timeSinceLastDamage >= this.regenDelay && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.regenPerSecond * dt);
    }

    if (this.emergencyFlashTimer > 0) this.emergencyFlashTimer -= dt;
    if (this.attackTimer > 0) this.attackTimer -= dt;
  }

  updateBehavior(dt, player, stats, speedMultiplier, webIntervalMultiplier) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dx !== 0 || dy !== 0) {
      this.facingLeft = dx < 0;
      this.facingDirection = vectorToDirection(dx, dy);
    }

    // Perseguição normal.
    if (dist > this.radius + player.radius) {
      const nx = dx / dist;
      const ny = dy / dist;
      this.x += nx * this.speed * speedMultiplier * dt;
      this.y += ny * this.speed * speedMultiplier * dt;
    }

    // Mordida corpo a corpo: dano direto + aplica veneno (dano contínuo por um tempo).
    if (dist <= this.attackRange && this.attackTimer <= 0) {
      player.takeDamage(this.contactDamage);
      player.applyPoison(stats.poisonDuration, stats.poisonDps);
      this.attackTimer = this.attackCooldown;
    }

    // Teia à distância: só dispara se o jogador não estiver já ao alcance da mordida.
    this.webTimer -= dt;
    if (this.webTimer <= 0 && dist > this.attackRange) {
      this.fireWeb(dx, dy, dist, stats);
      this.webTimer = stats.webInterval * webIntervalMultiplier;
    }
  }

  fireWeb(dx, dy, dist, stats) {
    const dirX = dist > 0 ? dx / dist : 1;
    const dirY = dist > 0 ? dy / dist : 0;

    Sound.play('bossWebShoot');

    this.webs.push(
      new SpiderWeb(
        this.x,
        this.y,
        dirX * stats.webSpeed,
        dirY * stats.webSpeed,
        stats.webRadius,
        stats.webSlowDuration,
        stats.webSlowMultiplier,
        stats.webLifetime
      )
    );
  }

  updateWebs(dt, player) {
    for (const web of this.webs) {
      if (!web.active) continue;

      web.update(dt);

      const dist = Math.hypot(player.x - web.x, player.y - web.y);
      if (dist <= web.radius + player.radius) {
        player.applySlow(web.slowDuration, web.slowMultiplier);
        web.active = false;
      }
    }

    this.webs = this.webs.filter((w) => w.active);
  }

  // Mesma regra da pistola dos inimigos comuns: enfraquece até o limite de execução, nunca mata.
  takeDamageFromPistol(damage) {
    if (!this.alive) return;

    this.timeSinceLastDamage = 0;

    if (this.hp <= this.executionLimit + 0.001) {
      this.triggerEmergencyRegen();
      return;
    }

    let newHp = this.hp - damage;
    if (newHp < this.executionLimit) newHp = this.executionLimit;
    this.hp = newHp;

    this.applyMark();
  }

  // A katana ignora o limite de execução e pode reduzir o HP a zero.
  takeDamageFromKatana(damage) {
    if (!this.alive) return;

    this.timeSinceLastDamage = 0;

    const finalDamage = damage * (1 + this.getMarkBonus());
    this.hp -= finalDamage;

    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      Sound.play('enemyDeath');
      Sound.stopBossSteps();
    }
  }

  triggerEmergencyRegen() {
    this.hp = Math.min(this.maxHp, this.hp + this.maxHp * this.emergencyRegenPercent);
    this.emergencyFlashTimer = 0.4;
  }

  applyMark() {
    const maxStacks = CONFIG.mark.levels.length;
    if (this.markStacks < maxStacks) this.markStacks++;
  }

  getMarkBonus() {
    if (this.markStacks <= 0) return 0;
    const level = CONFIG.mark.levels[this.markStacks - 1];
    return level ? level.bonus : 0;
  }

  draw(ctx) {
    if (!this.alive) return;

    // Teias em voo, desenhadas atrás do corpo do chefe.
    for (const web of this.webs) web.draw(ctx);

    if (this.markStacks > 0) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = this.markStacks === 1 ? '#ffd166' : '#ff6b6b';
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    if (this.emergencyFlashTimer > 0) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 18, 0, Math.PI * 2);
      ctx.strokeStyle = '#7cffb2';
      ctx.lineWidth = 5;
      ctx.stroke();
    }

    const stats = CONFIG.boss.types[this.bossKey];
    const sprite =
      stats.spriteMode === 'directional'
        ? getBossSprite(this.bossKey, this.facingDirection)
        : getBossSprite(this.bossKey);

    if (sprite.complete && sprite.naturalWidth > 0) {
      const size = this.radius * this.spriteScale;

      if (stats.spriteMode === 'directional') {
        // Sprite já vem virado pra direção certa — não precisa espelhar.
        ctx.drawImage(sprite, this.x - size / 2, this.y - size / 2, size, size);
      } else if (this.facingLeft) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
        ctx.restore();
      } else {
        ctx.drawImage(sprite, this.x - size / 2, this.y - size / 2, size, size);
      }
    } else {
      // Fallback provisório enquanto o sprite não carregou.
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }

    // A barra de vida individual acima da cabeça fica pequena demais pra um chefe;
    // a barra grande no topo da tela (desenhada em Game.draw) já cobre isso.
  }
}
