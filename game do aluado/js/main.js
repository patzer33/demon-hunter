const canvas = document.getElementById('gameCanvas');
const hudEl = document.getElementById('hud');
const controlsHintEl = document.getElementById('controls');

const input = {
  keys: {},
};

const mouseWorld = { x: 0, y: 0 };

// Estado do app: 'menu' (telas do Menu) ou 'playing' (partida em andamento, controlada pelo Game).
let currentScreen = 'menu';

function setHudVisible(visible) {
  hudEl.style.display = visible ? 'block' : 'none';
  controlsHintEl.style.display = visible ? 'block' : 'none';
}

function startGame() {
  currentScreen = 'playing';
  setHudVisible(true);
  Game.init(canvas);
}

Menu.onPlay = startGame;

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();

  if (e.repeat) return; // evita repetir a ação enquanto a tecla fica pressionada

  input.keys[key] = true;

  if (currentScreen === 'menu') {
    // ESC volta pra tela principal do menu quando estiver numa tela secundária (Controles/Recordes/Opções).
    if (key === 'escape') Menu.goBackToMain();
    return;
  }

  // A partir daqui, currentScreen === 'playing'.

  // ESC alterna a pausa (só faz sentido se o jogador ainda estiver vivo).
  if (key === 'escape' && !Game.gameOver) {
    Game.paused = !Game.paused;
    return;
  }

  // Se o jogador morreu OU o jogo está pausado, R reinicia a partida em vez de recarregar a arma.
  if (key === 'r' && (Game.gameOver || Game.paused)) {
    Game.restart();
    return;
  }

  if (Game.gameOver || Game.paused) return;

  if (key === '1') Game.player.switchWeapon('pistol');
  if (key === '2') Game.player.switchWeapon('katana');
  if (key === 'r') Game.player.reload();
});

window.addEventListener('keyup', (e) => {
  input.keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseWorld.x = (e.clientX - rect.left) * (canvas.width / rect.width);
  mouseWorld.y = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (currentScreen === 'menu') {
    Menu.handleMouseMove(mouseWorld.x, mouseWorld.y);
  }
});

canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;

  if (currentScreen === 'menu') {
    Menu.handleClick(mouseWorld.x, mouseWorld.y);
    return;
  }

  if (currentScreen === 'playing' && !Game.gameOver && !Game.paused) {
    Game.player.attack(Game.bullets, Game.enemies);
  }
});

Menu.init(canvas);

let lastTime = performance.now();

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05); // trava dt para evitar saltos ao trocar de aba
  lastTime = now;

  if (currentScreen === 'playing') {
    Game.update(dt, input, mouseWorld);
    Game.draw();
  } else {
    Menu.draw(Menu.ctx);
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
