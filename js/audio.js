(() => {
  const AUDIO_ROOT = "assets/audio";
  const tracks = {
    lobby: { src: `${AUDIO_ROOT}/bgm_lobby.ogg`, loop: true, volume: 0.32 },
    game: { src: `${AUDIO_ROOT}/bgm_game.ogg`, loop: true, volume: 0.42 },
    recover: { src: `${AUDIO_ROOT}/sfx_recover.ogg`, loop: false, volume: 0.65 },
    hit: { src: `${AUDIO_ROOT}/sfx_hit.ogg`, loop: false, volume: 0.7 },
    data: { src: `${AUDIO_ROOT}/sfx_data.ogg`, loop: false, volume: 0.6 },
  };

  const pool = {};
  let unlocked = false;
  let muted = false;
  let currentBgm = null;

  Object.entries(tracks).forEach(([key, meta]) => {
    const audio = new Audio(meta.src);
    audio.preload = "auto";
    audio.loop = meta.loop;
    audio.volume = meta.volume;
    pool[key] = audio;
  });

  function applyMute() {
    Object.values(pool).forEach((audio) => {
      audio.muted = muted;
    });
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    playBgm("lobby");
  }

  function playBgm(name) {
    if (!unlocked || muted) return;
    if (currentBgm === name) {
      const active = pool[name];
      if (active.paused) active.play().catch(() => {});
      return;
    }
    ["lobby", "game"].forEach((key) => {
      const track = pool[key];
      track.pause();
      track.currentTime = 0;
    });
    currentBgm = name;
    const next = pool[name];
    next.play().catch(() => {});
  }

  function stopBgm() {
    ["lobby", "game"].forEach((key) => {
      pool[key].pause();
      pool[key].currentTime = 0;
    });
    currentBgm = null;
  }

  function playSfx(name) {
    if (!unlocked || muted) return;
    const base = pool[name];
    if (!base) return;
    const sfx = base.cloneNode();
    sfx.volume = base.volume;
    sfx.loop = false;
    sfx.play().catch(() => {});
  }

  function toggleMute() {
    muted = !muted;
    applyMute();
    if (!muted && unlocked && currentBgm) {
      pool[currentBgm].play().catch(() => {});
    }
    return muted;
  }

  function bindUnlock() {
    const unlockOnce = () => {
      unlock();
      window.removeEventListener("pointerdown", unlockOnce);
      window.removeEventListener("keydown", unlockOnce);
    };
    window.addEventListener("pointerdown", unlockOnce, { once: true });
    window.addEventListener("keydown", unlockOnce, { once: true });
  }

  bindUnlock();

  window.gameAudio = {
    unlock,
    playBgm,
    stopBgm,
    playSfx,
    toggleMute,
    isMuted: () => muted,
  };
})();
