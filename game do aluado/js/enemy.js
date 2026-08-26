// Sprites dos inimigos, um por tipo. Carregados uma única vez e compartilhados entre todas
// as instâncias do mesmo tipo (evita recarregar a imagem a cada spawn).
const ENEMY_SPRITE_PATHS = {
  normal: 'assets/images/enemy_normal.png',
  fast: 'assets/images/enemy_fast.png',
  heavy: 'assets/images/enemy_heavy.png',
};
const enemySpriteCache = {};

function getEnemySprite(type) {
  if (!enemySpriteCache[type]) {
    const img = new Image();
    img.src = ENEMY_SPRITE_PATHS[type] || ENEMY_SPRITE_PATHS.normal;
    enemySpriteCache[type] = img;
  }
  return enemySpriteCache[type];
}

class Enemy {
  constructor(x, y, type = 'normal') {
    const stats = Enemy.getStatsForType(type);

    this.type = type;
    this.x = x;
    this.y = y;
    this.radius = stats.radius;
    this.color = stats.color;
    this.scoreValue = stats.scoreValue;
    this.sprite = getEnemySprite(type);
    this.spriteScale = stats.spriteScale;
    this.facingLeft = false; // usado pra espelhar o sprite quando anda pra esquerda

    this.maxHp = stats.maxHp;
    this.hp = this.maxHp;
    this.speed = stats.speed;

    this.contactDamage = stats.contactDamage;
    this.attackCooldown = stats.attackCooldown;
    this.attackRange = stats.attackRange;
    this.attackTimer = 0;

    // Limite de execução: a pistola nunca reduz o HP abaixo disso.
    this.executionLimit = this.maxHp * stats.executionThreshold;
    this.emergencyRegenPercent = stats.emergencyRegenPercent;
    this.emergencyFlashTimer = 0;

    // Regeneração normal (por tempo sem receber dano).
    this.regenDelay = stats.regenDelay;
    this.regenPerSecond = stats.regenPerSecond;
    this.timeSinceLastDamage = 0;

    // Marca aplicada pela pistola (aumenta dano da katana).
    this.markStacks = 0;

    this.alive = true;
  }

  // Mapeia o tipo do inimigo para o bloco de balanceamento correspondente no CONFIG.
  static getStatsForType(type) {
    if (type === 'fast') return CONFIG.enemyFast;
    if (type === 'heavy') return CONFIG.enemyHeavy;
    return CONFIG.enemy;
  }

  update(dt, player) {
    if (!this.alive) return;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > this.radius + player.radius) {
      const nx = dx / dist;
      const ny = dy / dist;
      this.x += nx * this.speed * dt;
      this.y += ny * this.speed * dt;
    }

    // Guarda a direção horizontal (pra espelhar o sprite quando o inimigo anda pra esquerda).
    if (dx !== 0) this.facingLeft = dx < 0;

    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (dist <= this.attackRange && this.attackTimer <= 0) {
      player.takeDamage(this.contactDamage);
      this.attackTimer = this.attackCooldown;
    }

    // Regeneração normal: só começa depois de `regenDelay` segundos sem dano.
    this.timeSinceLastDamage += dt;
    if (this.timeSinceLastDamage >= this.regenDelay && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.regenPerSecond * dt);
    }

    if (this.emergencyFlashTimer > 0) this.emergencyFlashTimer -= dt;
  }

  // Regra central do jogo: a pistola enfraquece, mas nunca mata.
  takeDamageFromPistol(damage) {
    if (!this.alive) return;

    this.timeSinceLastDamage = 0;

    // Já está no limite de execução: mais um tiro dispara a Regeneração de Emergência.
    if (this.hp <= this.executionLimit + 0.001) {
      this.triggerEmergencyRegen();
      return;
    }

    let newHp = this.hp - damage;
    if (newHp < this.executionLimit) {
      newHp = this.executionLimit; // trava exatamente no limite, não passa disso
    }
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

    // Aura da Marca (amarelo = nível I, vermelho = nível II)
    if (this.markStacks > 0) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = this.markStacks === 1 ? '#ffd166' : '#ff6b6b';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Flash verde ao disparar a Regeneração de Emergência
    if (this.emergencyFlashTimer > 0) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 12, 0, Math.PI * 2);
      ctx.strokeStyle = '#7cffb2';
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    // Corpo — usa o sprite do tipo se já tiver carregado; senão, o círculo colorido de sempre.
    if (this.sprite.complete && this.sprite.naturalWidth > 0) {
      const size = this.radius * this.spriteScale;

      if (this.facingLeft) {
        // Espelha horizontalmente (o sprite nasceu olhando/andando pra direita).
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(-1, 1);
        ctx.drawImage(this.sprite, -size / 2, -size / 2, size, size);
        ctx.restore();
      } else {
        ctx.drawImage(this.sprite, this.x - size / 2, this.y - size / 2, size, size);
      }
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }

    // Barra de vida
    const barWidth = 40;
    const barHeight = 5;
    const hpRatio = this.hp / this.maxHp;

    ctx.fillStyle = '#333';
    ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 14, barWidth, barHeight);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 14, barWidth * hpRatio, barHeight);

    // Marcador branco indicando onde fica o limite de execução
    const limitRatio = this.executionLimit / this.maxHp;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.x - barWidth / 2 + barWidth * limitRatio - 1, this.y - this.radius - 15, 2, barHeight + 2);
  }
}
