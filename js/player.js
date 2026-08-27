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

    // Sprite da katana e da pistola (desenhados na mão do jogador conforme a arma equipada).
    this.katanaImage = new Image();
    this.katanaImage.src = 'assets/images/weapons/katana.png';

    this.pistolImage = new Image();
    this.pistolImage.src = 'assets/images/weapons/pistol.png';

    // Sprite do corpo: animação de "idle" com 9 quadros por direção (8 direções).
    this.bodyFrames = {};
    const directions = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
    directions.forEach((dir) => {
      this.bodyFrames[dir] = [];
      for (let i = 0; i < CONFIG.player.idleFrameCount; i++) {
        const img = new Image();
        img.src = `assets/images/player/frames/player_${dir}_${i}.png`;
        this.bodyFrames[dir].push(img);
      }
    });
    this.facingDirection = 'south';
    this.idleAnimTimer = 0;
    this.idleFrame = 0;
    this.isMoving = false;

    // Efeitos de status (aplicados por ataques de chefes, por exemplo a mordida/teia da aranha).
    this.poisonTimer = 0;
    this.poisonDps = 0;
    this.slowTimer = 0;
    this.slowMultiplier = 1;

    // Feedback visual de dano recebido (vinheta vermelha piscando na borda da tela).
    this.damageFlashTimer = 0;
  }

  update(dt, input, mouseWorld, canvasWidth, canvasHeight) {
    if (!this.alive) return;

    let dx = 0;
    let dy = 0;
    if (input.keys['w']) dy -= 1;
    if (input.keys['s']) dy += 1;
    if (input.keys['a']) dx -= 1;
    if (input.keys['d']) dx += 1;

    const effectiveSpeed = this.speed * (this.slowTimer > 0 ? this.slowMultiplier : 1);

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      this.x += dx * effectiveSpeed * dt;
      this.y += dy * effectiveSpeed * dt;
      this.isMoving = true;
      Sound.startFootsteps();
    } else {
      this.isMoving = false;
      Sound.stopFootsteps();
    }

    this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));

    this.angle = Math.atan2(mouseWorld.y - this.y, mouseWorld.x - this.x);
    // O personagem encara a direção da mira (mesma lógica de direção usada no boss).
    this.facingDirection = vectorToDirection(Math.cos(this.angle), Math.sin(this.angle));

    // A animação só roda enquanto o jogador está se movendo; parado, fica fixo no quadro 0.
    if (this.isMoving) {
      this.idleAnimTimer += dt;
      if (this.idleAnimTimer >= CONFIG.player.idleFrameDuration) {
        this.idleAnimTimer = 0;
        this.idleFrame = (this.idleFrame + 1) % CONFIG.player.idleFrameCount;
      }
    } else {
      this.idleAnimTimer = 0;
      this.idleFrame = 0;
    }

    this.pistol.update(dt);
    this.katana.update(dt);

    // Veneno: dano contínuo enquanto o timer estiver ativo.
    if (this.poisonTimer > 0) {
      this.poisonTimer -= dt;
      this.hp -= this.poisonDps * dt;
      if (this.hp <= 0) {
        this.hp = 0;
        this.alive = false;
      }
    }

    if (this.slowTimer > 0) this.slowTimer -= dt;
    if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;
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
    this.damageFlashTimer = CONFIG.player.damageFlashDuration;
    Sound.play('playerDamage');

    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      Sound.stopFootsteps();
    }
  }

  // Aplicado por ataques de veneno (ex: mordida da aranha). Renova a duração em vez de somar,
  // pra não acumular dano infinito se o jogador for mordido várias vezes seguidas.
  applyPoison(duration, dps) {
    this.poisonTimer = duration;
    this.poisonDps = dps;
  }

  // Aplicado por efeitos de lentidão (ex: teia da aranha).
  applySlow(duration, multiplier) {
    this.slowTimer = duration;
    this.slowMultiplier = multiplier;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Auras de status: verde = envenenado, roxo = atolado na teia (lento).
    if (this.poisonTimer > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    if (this.slowTimer > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 11, 0, Math.PI * 2);
      ctx.strokeStyle = '#c4b5fd';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Corpo do jogador: usa o sprite da direção que está encarando, se já carregado; senão,
    // um círculo simples como fallback.
    // O tamanho visual é maior que o hitbox de colisão (this.radius) só pra ficar visível no canvas grande;
    // a colisão/movimentação continuam baseadas em this.radius, sem mudança de balanceamento.
    const activeImage = this.bodyFrames[this.facingDirection][this.idleFrame];

    if (activeImage.complete && activeImage.naturalWidth > 0) {
      const bodySize = this.radius * CONFIG.player.spriteScale;
      ctx.drawImage(activeImage, -bodySize / 2, -bodySize / 2, bodySize, bodySize);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#103bfa';
      ctx.fill();
    }

    // Pivô da mão: calculado ANTES da rotação/espelhamento, com o mesmo valor pras duas armas.
    // O lado do pivô (esquerda/direita) agora também espelha junto com a arma — antes ele ficava
    // sempre fixo do lado direito do corpo, então mirar pra esquerda nunca alcançava tão longe
    // quanto mirar pra direita. Agora os dois lados são espelho exato um do outro.
    const facingLeft = Math.cos(this.angle) < 0;
    const handOffsetX = facingLeft ? -(this.radius * 0.5) : this.radius * 0.5;
    ctx.translate(handOffsetX, 6);

    // Rotação da arma seguindo a mira. Quando o jogador mira pra esquerda, em vez de girar o
    // sprite continuamente (o que faria ele ficar de cabeça pra baixo/estranho perto de 180°),
    // espelhamos a imagem verticalmente e usamos o ângulo negativo — assim a arma sempre aponta
    // certo, mas nunca aparece "invertida". Isso não afeta a física/mira real (this.angle
    // continua intacto pra tiro, ataque de katana etc.), é só um ajuste visual.
    if (facingLeft) {
      ctx.scale(1, -1);
      ctx.rotate(-this.angle);
    } else {
      ctx.rotate(this.angle);
    }

    // Pistola equipada: desenha o sprite apontando pra direção da mira (sem animação por enquanto).
    if (this.currentWeapon === 'pistol') {
      if (this.pistolImage.complete && this.pistolImage.naturalWidth > 0) {
        // Pontos calibrados manualmente nos pixels do sprite atual (cabo/mão e boca do cano).
        // Se o sprite da pistola for redesenhado, estes valores podem precisar de ajuste.
        const gripX = 19.3;
        const gripY = 25.3;
        const forwardAngle = -0.39; // ângulo do vetor cabo→cano dentro da imagem original

        ctx.save();
        ctx.rotate(-forwardAngle); // corrige a inclinação do sprite pra apontar exatamente pra frente

        const spriteSize = CONFIG.sprite.baseSize; // dimensão-base dos sprites (48x48), sem ampliação artificial
        ctx.drawImage(this.pistolImage, -gripX, -gripY, spriteSize, spriteSize);
        ctx.restore();
      } else {
        // Fallback enquanto o sprite não carrega (ou não existe ainda): indicador simples de mira.
        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(this.radius + 14, -5);
        ctx.lineTo(this.radius + 14, 5);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
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
        // Pontos calibrados manualmente nos pixels do sprite atual (cabo/mão e ponta da lâmina).
        // Se o sprite da katana for redesenhado, estes valores podem precisar de ajuste.
        const gripX = 10;
        const gripY = 23.5;
        const forwardAngle = -0.134; // ângulo do vetor cabo→ponta dentro da imagem original

        ctx.save();
        ctx.rotate(bladeAngle - forwardAngle); // corrige a inclinação do sprite e aplica o golpe

        const spriteSize = CONFIG.sprite.baseSize; // dimensão-base dos sprites (48x48), sem ampliação artificial
        ctx.drawImage(this.katanaImage, -gripX, -gripY, spriteSize, spriteSize);
        ctx.restore();
      }
    }

    ctx.restore();
  }
}
