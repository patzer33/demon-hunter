// Gerenciador central de áudio: efeitos sonoros (tocados uma vez, podem sobrepor) e música
// de fundo (um único trilho por vez, em loop). Fica separado do resto pra ser fácil ligar/desligar
// tudo depois (ex: opção de mudo em Configurações) sem mexer em cada lugar que toca som.
const Sound = {
  enabled: true, // reservado pra uma futura opção de mudo em Configurações
  sfxVolume: 0.6,
  musicVolume: 0.32,

  paths: {
    pistolShot: 'assets/sounds/pistol_shot.mp3',
    pistolReload: 'assets/sounds/pistol_reload.mp3',
    katanaSwing: 'assets/sounds/katana_swing.mp3',
    katanaHit: 'assets/sounds/katana_hit.wav',
    playerDamage: 'assets/sounds/player_melee_damage.wav', // "dano.wav" — jogador tomando dano corpo a corpo
    enemyGrowl: 'assets/sounds/enemy_generic_growl.wav',   // "monstro.wav" — grito genérico de inimigo
    enemyDeath: 'assets/sounds/enemy_death.mp3',
    uiClick: 'assets/sounds/ui_click.wav',
    gameOver: 'assets/sounds/game_over.mp3',
    victory: 'assets/sounds/victory.wav',
    bossWebShoot: 'assets/sounds/boss_web_shoot.mp3',
  },

  musicPaths: {
    menu: 'assets/sounds/music_menu.mp3',
    gameplay: 'assets/sounds/music_gameplay.mp3',
    boss: 'assets/sounds/music_boss.mp3',
  },

  currentMusic: null,
  currentMusicKey: null,
  footstepAudio: null,
  bossStepAudio: null,

  // Toca um efeito sonoro uma vez. Cria um novo <audio> a cada chamada (em vez de reaproveitar
  // um só) pra permitir sons sobrepostos — por exemplo, vários tiros em sequência rápida.
  play(key, volumeOverride) {
    if (!this.enabled) return;

    const path = this.paths[key];
    if (!path) return;

    const audio = new Audio(path);
    audio.volume = volumeOverride !== undefined ? volumeOverride : this.sfxVolume;
    // Navegadores bloqueiam áudio antes de qualquer interação do usuário; se isso acontecer,
    // a Promise rejeita — apenas ignoramos, não é um erro real do jogo.
    audio.play().catch(() => {});
  },

  // Troca a música de fundo (para a anterior e começa a nova em loop). Não faz nada se a música
  // pedida já for a que está tocando.
  playMusic(key) {
    if (!this.enabled) return;
    if (this.currentMusicKey === key) return;

    if (this.currentMusic) {
      this.currentMusic.pause();
    }

    const path = this.musicPaths[key];
    if (!path) {
      this.currentMusic = null;
      this.currentMusicKey = null;
      return;
    }

    const audio = new Audio(path);
    audio.loop = true;
    audio.volume = this.musicVolume;
    audio.play().catch(() => {});

    this.currentMusic = audio;
    this.currentMusicKey = key;
  },

  stopMusic() {
    if (this.currentMusic) this.currentMusic.pause();
    this.currentMusic = null;
    this.currentMusicKey = null;
  },

  // Passos do jogador: um loop contínuo, ligado/desligado conforme ele anda ou para.
  startFootsteps() {
    if (!this.enabled || this.footstepAudio) return;

    const audio = new Audio('assets/sounds/player_step.mp3');
    audio.loop = true;
    audio.volume = this.sfxVolume * 0.5;
    audio.play().catch(() => {});
    this.footstepAudio = audio;
  },

  stopFootsteps() {
    if (!this.footstepAudio) return;
    this.footstepAudio.pause();
    this.footstepAudio = null;
  },

  // Passos do chefe: mesmo padrão, ligado enquanto ele estiver vivo numa onda de chefe.
  startBossSteps() {
    if (!this.enabled || this.bossStepAudio) return;

    const audio = new Audio('assets/sounds/boss_step.mp3');
    audio.loop = true;
    audio.volume = this.sfxVolume * 0.5;
    audio.play().catch(() => {});
    this.bossStepAudio = audio;
  },

  stopBossSteps() {
    if (!this.bossStepAudio) return;
    this.bossStepAudio.pause();
    this.bossStepAudio = null;
  },
};
