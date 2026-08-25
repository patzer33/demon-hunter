class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 16;
    this.speed = CONFIG.player.speed;
    this.maxHp = CONFIG.player.maxHp;
    this.hp = this.maxHp;
    this.angle = 0;
    this.alive = true;

    this.pistol = new Pistol();
    this.katana = new Katana();
    this.currentWeapon = 'pistol';

    // Sprite da katana (desenhado na mão do jogador quando ela está equipada).
    this.katanaImage = new Image();
    this.katanaImage.src = 'assets/images/katana.png';
  }

  update(dt, input, mouseWorld, canvasWidth, canvasHeight) {
    if (!this.alive) return;

    let dx = 0;
    let dy = 0;
    if (input.keys['w']) dy -= 1;
    if (input.keys['s']) dy += 1;
    if (input.keys['a']) dx -= 1;
    if (input.keys['d']) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      this.x += dx * this.speed * dt;
      this.y += dy * this.speed * dt;
    }

    this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));

    this.angle = Math.atan2(mouseWorld.y - this.y, mouseWorld.x - this.x);

    this.pistol.update(dt);
    this.katana.update(dt);
  }

  switchWeapon(weapon) {
    this.currentWeapon = weapon;
  }

  attack(bullets, enemies) {
    if (!this.alive) return;

    if (this.currentWeapon === 'pistol') {
      this.pistol.fire(this.x, this.y, this.angle, bullets);
    } else {
      this.katana.attack(this.x, this.y, this.angle, enemies);
    }
  }

  reload() {
    if (this.currentWeapon === 'pistol') {
      this.pistol.startReload();
    }
  }

  takeDamage(amount) {
    if (!this.alive) return;

    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Corpo do jogador
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#103bfa';
    ctx.fill();

    ctx.rotate(this.angle);

    // Indicador de direção/mira — usado só pra pistola, já que ainda não tem sprite dela.
    // Quando a katana está equipada, a própria espada já mostra a direção.
    if (this.currentWeapon === 'pistol') {
      ctx.beginPath();
      ctx.moveTo(this.radius, 0);
      ctx.lineTo(this.radius + 14, -5);
      ctx.lineTo(this.radius + 14, 5);
      ctx.closePath();
      ctx.fillStyle = '#858585';
      ctx.fill();
    }

    // Katana equipada: desenha o sprite na mão, girando durante o golpe.
    if (this.currentWeapon === 'katana') {
      const halfArc = (CONFIG.katana.arcDegrees / 2) * (Math.PI / 180);
      const swingDuration = 0.15; // deve bater com Katana.swingTimer em weapon.js

      let bladeAngle = -0.3; // ângulo de repouso (levemente pra cima), quando não está golpeando
      if (this.katana.swingTimer > 0) {
        const progress = 1 - this.katana.swingTimer / swingDuration;
        bladeAngle = -halfArc + 2 * halfArc * progress; // varre de -halfArc até +halfArc
      }

      // Arco translúcido mostrando a área de alcance durante o golpe (feedback de hit).
      if (this.katana.swingTimer > 0) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, this.katana.range, -halfArc, halfArc);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fill();
      }

      if (this.katanaImage.complete && this.katanaImage.naturalWidth > 0) {
        ctx.save();
        ctx.translate(this.radius * 0.6, 2); // pivô = cabo da espada, próximo à mão do personagem
        ctx.rotate(bladeAngle + Math.PI / 2); // sprite é desenhado "de pé" (ponta pra cima); rotaciona pra apontar pra frente

        const spriteSize = CONFIG.sprite.baseSize; // dimensão-base dos sprites (48x48), sem ampliação artificial
        // O cabo (base da imagem) fica no pivô; a lâmina (topo da imagem) se estende pra frente/cima.
        ctx.drawImage(this.katanaImage, -spriteSize / 2, -spriteSize, spriteSize, spriteSize);
        ctx.restore();
      }
    }

    ctx.restore();
  }
}
