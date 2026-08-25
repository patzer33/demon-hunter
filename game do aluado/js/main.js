const canvas = document.getElementById('gameCanvas');

const input = {
    keys: {},
};

const mouseWorld = { x: 0, y: 0 };

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    // Evita repetir a ação enquanto a tecla estiver pressionada
    if (e.repeat) return;

    input.keys[key] = true;

    // Se o jogador morreu, R reinicia o jogo
    if (key === 'r' && Game.gameOver) {
        Game.restart();
        return;
    }

    // Controles normais
    if (!Game.gameOver && Game.player) {
        if (key === '1') {
            Game.player.switchWeapon('pistol');
        }

        if (key === '2') {
            Game.player.switchWeapon('katana');
        }

        if (key === 'r') {
            Game.player.reload();
        }
    }
});

window.addEventListener('keyup', (e) => {
    input.keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();

    mouseWorld.x =
        (e.clientX - rect.left) * (canvas.width / rect.width);

    mouseWorld.y =
        (e.clientY - rect.top) * (canvas.height / rect.height);
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0 && !Game.gameOver && Game.player) {
        Game.player.attack(Game.bullets, Game.enemies);
    }
});

Game.init(canvas);

let lastTime = performance.now();

function loop(now) {
    const dt = Math.min(
        (now - lastTime) / 1000,
        0.05
    );

    lastTime = now;

    Game.update(dt, input, mouseWorld);
    Game.draw();

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);