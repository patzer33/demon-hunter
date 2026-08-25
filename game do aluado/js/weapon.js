// Pistola: longo alcance, munição, dano baixo. NÃO mata sozinha (ver Enemy.takeDamageFromPistol).
class Pistol {
  constructor() {
    this.magazineSize = CONFIG.pistol.magazineSize;
    this.ammo = CONFIG.pistol.magazineSize;
    this.reserve = CONFIG.pistol.reserveAmmo;
    this.damage = CONFIG.pistol.damage;
    this.fireCooldown = CONFIG.pistol.fireCooldown;
    this.reloadTime = CONFIG.pistol.reloadTime;

    this.cooldownTimer = 0;
    this.reloading = false;
    this.reloadTimer = 0;
  }

  update(dt) {
    if (this.cooldownTimer > 0) this.cooldownTimer -= dt;

    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) this.finishReload();
    }
  }

  canFire() {
    return !this.reloading && this.cooldownTimer <= 0 && this.ammo > 0;
  }

  fire(x, y, angle, bullets) {
    if (!this.canFire()) return;

    bullets.push(new Bullet(x, y, angle, 600, this.damage));
    this.ammo--;
    this.cooldownTimer = this.fireCooldown;

    if (this.ammo === 0) this.startReload();
  }

  startReload() {
    if (this.reloading || this.reserve <= 0 || this.ammo === this.magazineSize) return;
    this.reloading = true;
    this.reloadTimer = this.reloadTime;
  }

  finishReload() {
    const needed = this.magazineSize - this.ammo;
    const toLoad = Math.min(needed, this.reserve);
    this.ammo += toLoad;
    this.reserve -= toLoad;
    this.reloading = false;
  }
}

// Katana: curto alcance, dano alto, ignora o limite de execução e pode matar.
class Katana {
  constructor() {
    this.damage = CONFIG.katana.damage;
    this.range = CONFIG.katana.range;
    this.arcDegrees = CONFIG.katana.arcDegrees;
    this.cooldown = CONFIG.katana.attackCooldown;

    this.cooldownTimer = 0;
    this.swingTimer = 0; // usado só para o efeito visual do golpe
  }

  update(dt) {
    if (this.cooldownTimer > 0) this.cooldownTimer -= dt;
    if (this.swingTimer > 0) this.swingTimer -= dt;
  }

  canAttack() {
    return this.cooldownTimer <= 0;
  }

  attack(x, y, angle, enemies) {
    if (!this.canAttack()) return;

    this.cooldownTimer = this.cooldown;
    this.swingTimer = 0.15;

    const halfArc = (this.arcDegrees / 2) * (Math.PI / 180);

    for (const enemy of enemies) {
      if (!enemy.alive) continue;

      const dx = enemy.x - x;
      const dy = enemy.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist > this.range + enemy.radius) continue;

      const angleToEnemy = Math.atan2(dy, dx);
      let diff = angleToEnemy - angle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // normaliza para [-PI, PI]

      if (Math.abs(diff) <= halfArc) {
        enemy.takeDamageFromKatana(this.damage);
      }
    }
  }
}
