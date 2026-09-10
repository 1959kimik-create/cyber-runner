(() => {
  const STORAGE_KEY = "cyber-runner-settings";
  const AUDIO_ROOT = "assets/audio";
  const tracks = {
    lobby: { src: `${AUDIO_ROOT}/bgm_lobby.ogg`, loop: true, volume: 0.32, kind: "bgm" },
    game: { src: `${AUDIO_ROOT}/bgm_game.ogg`, loop: true, volume: 0.42, kind: "bgm" },
    recover: { src: `${AUDIO_ROOT}/sfx_recover.ogg`, loop: false, volume: 0.65, kind: "sfx" },
    hit: { src: `${AUDIO_ROOT}/sfx_hit.ogg`, loop: false, volume: 0.7, kind: "sfx" },
    data: { src: `${AUDIO_ROOT}/sfx_data.ogg`, loop: false, volume: 0.6, kind: "sfx" },
  };

  const pool = {};
  let unlocked = false;
  let currentBgm = null;
  let audioState = {
    bgmEnabled: true,
    sfxEnabled: true,
    bgmVolume: 0.8,
    sfxVolume: 0.8,
  };

  Object.entries(tracks).forEach(([key, meta]) => {
    const audio = new Audio(meta.src);
    audio.preload = "auto";
    audio.loop = meta.loop;
    pool[key] = audio;
  });

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveAudio() {
    const store = loadStore();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...store,
        bgmEnabled: audioState.bgmEnabled,
        sfxEnabled: audioState.sfxEnabled,
        bgmVolume: audioState.bgmVolume,
        sfxVolume: audioState.sfxVolume,
      })
    );
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function trackVolume(key) {
    const meta = tracks[key];
    if (!meta) return 0;
    const enabled = meta.kind === "bgm" ? audioState.bgmEnabled : audioState.sfxEnabled;
    const slider = meta.kind === "bgm" ? audioState.bgmVolume : audioState.sfxVolume;
    return enabled ? meta.volume * slider : 0;
  }

  function applyVolumes() {
    Object.entries(pool).forEach(([key, audio]) => {
      audio.volume = trackVolume(key);
    });
    if (currentBgm) {
      const track = pool[currentBgm];
      if (!audioState.bgmEnabled || audioState.bgmVolume <= 0) {
        track.pause();
      } else if (unlocked && track.paused) {
        track.play().catch(() => {});
      }
    }
  }

  function hydrate() {
    const store = loadStore();
    if (typeof store.bgmEnabled === "boolean") audioState.bgmEnabled = store.bgmEnabled;
    if (typeof store.sfxEnabled === "boolean") audioState.sfxEnabled = store.sfxEnabled;
    if (store.bgmVolume != null) audioState.bgmVolume = clamp01(store.bgmVolume);
    if (store.sfxVolume != null) audioState.sfxVolume = clamp01(store.sfxVolume);
    applyVolumes();
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    playBgm("lobby");
  }

  function playBgm(name) {
    if (!unlocked) return;
    if (currentBgm === name) {
      const active = pool[name];
      if (audioState.bgmEnabled && audioState.bgmVolume > 0 && active.paused) {
        active.volume = trackVolume(name);
        active.play().catch(() => {});
      }
      return;
    }
    ["lobby", "game"].forEach((key) => {
      const track = pool[key];
      track.pause();
      track.currentTime = 0;
    });
    currentBgm = name;
    const next = pool[name];
    next.volume = trackVolume(name);
    if (!audioState.bgmEnabled || audioState.bgmVolume <= 0) return;
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
    if (!unlocked || !audioState.sfxEnabled || audioState.sfxVolume <= 0) return;
    const base = pool[name];
    if (!base) return;
    const sfx = base.cloneNode();
    sfx.volume = trackVolume(name);
    sfx.loop = false;
    sfx.play().catch(() => {});
  }

  function setAudioSettings(partial) {
    if (partial.bgmEnabled != null) audioState.bgmEnabled = Boolean(partial.bgmEnabled);
    if (partial.sfxEnabled != null) audioState.sfxEnabled = Boolean(partial.sfxEnabled);
    if (partial.bgmVolume != null) audioState.bgmVolume = clamp01(partial.bgmVolume);
    if (partial.sfxVolume != null) audioState.sfxVolume = clamp01(partial.sfxVolume);
    applyVolumes();
    saveAudio();
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

  hydrate();
  bindUnlock();

  window.gameAudio = {
    unlock,
    playBgm,
    stopBgm,
    playSfx,
    setAudioSettings,
    getAudioSettings: () => ({ ...audioState }),
  };
})();
