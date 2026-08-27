// Item coletável que pode cair de um inimigo derrotado: vida ou munição.
// Visual provisório (formas simples) até a pixel art (coração/caixa de munição) ser integrada.
class Pickup {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // 'health' ou 'ammo'
    this.radius = CONFIG.pickups.radius;
    this.lifetime = CONFIG.pickups.lifetime; // some do mapa se não for coletado a tempo
    this.active = true;
  }

  update(dt) {
    this.lifetime -= dt;
    if (this.lifetime <= 0) this.active = false;
  }

  draw(ctx) {
    // Pisca nos últimos segundos antes de sumir, pra avisar o jogador.
    if (this.lifetime < 3 && Math.floor(this.lifetime * 6) % 2 === 0) return;

    if (this.type === 'health') {
      this.drawHeart(ctx);
    } else {
      this.drawAmmoBox(ctx);
    }
  }

  drawHeart(ctx) {
    const r = this.radius * 0.55;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + r);
    ctx.bezierCurveTo(this.x - r * 1.6, this.y - r * 0.6, this.x - r * 0.6, this.y - r * 1.6, this.x, this.y - r * 0.3);
    ctx.bezierCurveTo(this.x + r * 0.6, this.y - r * 1.6, this.x + r * 1.6, this.y - r * 0.6, this.x, this.y + r);
    ctx.fill();
  }

  drawAmmoBox(ctx) {
    const w = this.radius * 1.8;
    const h = this.radius * 1.1;
    ctx.fillStyle = '#facc15';
    ctx.fillRect(this.x - w / 2, this.y - h / 2, w, h);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x - w / 2, this.y - h / 2, w, h);
  }
}
