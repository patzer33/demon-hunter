// Projétil disparado pela pistola.

const bulletImage = new Image();
bulletImage.src = 'assets/images/weapons/bullet.png';

class Bullet {
  constructor(x, y, angle, speed, damage) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 4;
    this.damage = damage;
    this.active = true;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(ctx) {
    if (bulletImage.complete && bulletImage.naturalWidth > 0) {
      const size = 20;
      ctx.save();
      ctx.translate(this.x, this.y);
      // O sprite nasceu apontando pra cima; +90° o alinha com a direção real do disparo.
      ctx.rotate(this.angle + Math.PI / 2);
      ctx.drawImage(bulletImage, -size / 2, -size / 2, size, size);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe066';
      ctx.fill();
    }
  }

  isOffScreen(width, height) {
    return this.x < -20 || this.x > width + 20 || this.y < -20 || this.y > height + 20;
  }
}
