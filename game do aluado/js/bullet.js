// Projétil disparado pela pistola.
class Bullet {
  constructor(x, y, angle, speed, damage) {
    this.x = x;
    this.y = y;
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
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe066';
    ctx.fill();
  }

  isOffScreen(width, height) {
    return this.x < -20 || this.x > width + 20 || this.y < -20 || this.y > height + 20;
  }
}
