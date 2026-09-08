(() => {
  const MAX_LIVES = 5;
  const LANES = [-1, 0, 1];
  const SPRITE_ROOT = "assets/sprites";
  const MANIFEST_FALLBACK = {
    characters: {
      bbia: {
        name: "삐아",
        animations: {
          front: ["front/00.png"],
          run: ["run/00.png", "run/01.png", "run/02.png", "run/03.png"],
          recover: ["recover/00.png"],
          hit: ["hit/00.png", "hit/01.png", "hit/02.png"],
        },
      },
      oreu: {
        name: "오르",
        animations: {
          front: ["front/00.png"],
          run: ["run/00.png", "run/01.png", "run/02.png", "run/03.png"],
          recover: ["recover/00.png", "recover/01.png", "recover/02.png"],
          hit: ["hit/00.png", "hit/01.png", "hit/02.png"],
        },
      },
    },
  };
  const ANIM = {
    front: { fps: 1, loop: true },
    run: { fps: 10, loop: true },
    recover: { fps: 8, loop: false },
    hit: { fps: 8, loop: true },
  };

  const selectScreen = document.getElementById("select-screen");
  const playScreen = document.getElementById("play-screen");
  const overScreen = document.getElementById("over-screen");
  const heartsEl = document.getElementById("hearts");
  const scoreEl = document.getElementById("score");
  const distanceEl = document.getElementById("distance");
  const finalScoreEl = document.getElementById("final-score");
  const finalDistanceEl = document.getElementById("final-distance");
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const charCards = document.querySelectorAll(".char-card");

  let manifest = null;
  const sprites = {};
  let spritesReady = false;

  const state = {
    screen: "select",
    character: "bbia",
    lastCharacter: "bbia",
    lane: 0,
    targetLane: 0,
    jumpT: 0,
    lives: MAX_LIVES,
    score: 0,
    distance: 0,
    speed: 0.22,
    invincible: 0,
    spawnTimer: 0,
    objects: [],
    running: false,
    lastTime: 0,
    anim: "run",
    animTime: 0,
    recoverTimer: 0,
  };

  function sfx(name) {
    window.gameAudio?.playSfx(name);
  }

  function show(screen) {
    selectScreen.classList.toggle("hidden", screen !== "select");
    playScreen.classList.toggle("hidden", screen !== "play");
    overScreen.classList.toggle("hidden", screen !== "over");
    state.screen = screen;
    if (screen === "select") window.gameAudio?.playBgm("lobby");
    if (screen === "play") window.gameAudio?.playBgm("game");
    if (screen === "over") window.gameAudio?.stopBgm();
  }

  function setCardsEnabled(ready) {
    charCards.forEach((btn) => {
      btn.classList.toggle("loading", !ready);
      btn.removeAttribute("disabled");
    });
    const loadHint = document.getElementById("load-hint");
    const playHint = document.getElementById("play-hint");
    if (loadHint && playHint) {
      loadHint.classList.toggle("hidden", ready);
      playHint.classList.toggle("hidden", !ready);
    }
  }

  function collectBgSamples(px, w, h) {
    const points = [];
    for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 8))) {
      points.push([x, 0], [x, h - 1]);
    }
    for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 8))) {
      points.push([0, y], [w - 1, y]);
    }
    const samples = [];
    points.forEach(([x, y]) => {
      const p = (y * w + x) * 4;
      const r = px[p];
      const g = px[p + 1];
      const b = px[p + 2];
      const spread = Math.max(r, g, b) - Math.min(r, g, b);
      if (spread < 12) samples.push([r, g, b]);
    });
    return samples;
  }

  function matchesBgSample(r, g, b, samples) {
    return samples.some(
      ([sr, sg, sb]) => Math.abs(r - sr) <= 10 && Math.abs(g - sg) <= 10 && Math.abs(b - sb) <= 10
    );
  }

  function isBackgroundPixel(r, g, b, a, samples) {
    if (a < 8) return true;
    if (samples.length && matchesBgSample(r, g, b, samples)) return true;
    if (r >= 253 && g >= 253 && b >= 253) return true;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    const avg = (r + g + b) / 3;
    if (spread < 5 && avg >= 165 && avg <= 252) return true;
    return false;
  }

  function removeBackground(img) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d", { willReadFrequently: true });
    octx.drawImage(img, 0, 0);
    const data = octx.getImageData(0, 0, w, h);
    const px = data.data;
    const samples = collectBgSamples(px, w, h);
    const visited = new Uint8Array(w * h);
    const queue = [];

    function push(x, y) {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const i = y * w + x;
      if (visited[i]) return;
      const p = i * 4;
      if (!isBackgroundPixel(px[p], px[p + 1], px[p + 2], px[p + 3], samples)) return;
      visited[i] = 1;
      queue.push(i);
    }

    for (let x = 0; x < w; x += 1) {
      push(x, 0);
      push(x, h - 1);
    }
    for (let y = 0; y < h; y += 1) {
      push(0, y);
      push(w - 1, y);
    }

    while (queue.length) {
      const i = queue.pop();
      const x = i % w;
      const y = (i - x) / w;
      const p = i * 4;
      px[p + 3] = 0;
      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }

    octx.putImageData(data, 0, 0);
    return off;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          resolve(removeBackground(img));
        } catch {
          resolve(img);
        }
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  async function processSelectPhotos() {
    const photos = document.querySelectorAll(".char-photo");
    await Promise.allSettled(
      [...photos].map(async (el) => {
        const img = await loadImage(el.getAttribute("src"));
        el.src = img.toDataURL("image/png");
      })
    );
  }

  async function loadAllSprites() {
    try {
      const res = await fetch(`${SPRITE_ROOT}/manifest.json`);
      manifest = res.ok ? await res.json() : MANIFEST_FALLBACK;
    } catch {
      manifest = MANIFEST_FALLBACK;
    }

    const tasks = Object.entries(manifest.characters).flatMap(([key, data]) =>
      Object.entries(data.animations).flatMap(([anim, files]) =>
        files.map(async (file, index) => {
          try {
            const img = await loadImage(`${SPRITE_ROOT}/${key}/${file}`);
            if (!sprites[key]) sprites[key] = {};
            if (!sprites[key][anim]) sprites[key][anim] = [];
            sprites[key][anim][index] = img;
          } catch {
            /* 개별 프레임 로드 실패 시 fallback 도형 사용 */
          }
        })
      )
    );

    await Promise.allSettled(tasks);
    spritesReady = true;
    setCardsEnabled(true);
  }

  function clipLength(character, anim) {
    return sprites[character]?.[anim]?.length || 0;
  }

  function recoverDuration(character) {
    const count = clipLength(character, "recover");
    const fps = ANIM.recover.fps;
    const base = count > 0 ? count / fps : 0.4;
    return Math.max(0.6, base);
  }

  function renderHearts() {
    heartsEl.innerHTML = "";
    for (let i = 0; i < MAX_LIVES; i += 1) {
      const span = document.createElement("span");
      span.textContent = "♥";
      span.className = i < state.lives ? "on" : "off";
      heartsEl.appendChild(span);
    }
  }

  function updateHud() {
    renderHearts();
    scoreEl.textContent = String(Math.floor(state.score));
    distanceEl.textContent = `${Math.floor(state.distance)}m`;
  }

  function setAnim(name) {
    if (state.anim === name) return;
    state.anim = name;
    state.animTime = 0;
  }

  function resetGame(character) {
    window.gameAudio?.unlock();
    state.character = character;
    state.lastCharacter = character;
    state.lane = 0;
    state.targetLane = 0;
    state.jumpT = 0;
    state.lives = MAX_LIVES;
    state.score = 0;
    state.distance = 0;
    state.speed = 0.22;
    state.invincible = 0;
    state.spawnTimer = 0.6;
    state.objects = [];
    state.running = true;
    state.lastTime = 0;
    state.anim = "run";
    state.animTime = 0;
    state.recoverTimer = 0;
    updateHud();
    show("play");
    requestAnimationFrame(loop);
  }

  function endGame() {
    state.running = false;
    finalScoreEl.textContent = String(Math.floor(state.score));
    finalDistanceEl.textContent = `${Math.floor(state.distance)}m`;
    show("over");
  }

  function project(lane, z) {
    const y = 90 + z * 560;
    const scale = 0.12 + z * 0.9;
    const spread = 48 + z * 150;
    return {
      x: canvas.width / 2 + lane * spread,
      y,
      scale,
    };
  }

  function spawnObject() {
    const roll = Math.random();
    let type = "virus";
    if (roll > 0.82) type = "vaccine";
    else if (roll > 0.55) type = "chip";

    const occupied = new Set(
      state.objects.filter((item) => item.z < 0.18).map((item) => item.lane)
    );
    const open = LANES.filter((lane) => !occupied.has(lane));
    const lane = open.length ? open[Math.floor(Math.random() * open.length)] : LANES[1];

    state.objects.push({ type, lane, z: 0 });
  }

  function setLane(next) {
    state.targetLane = Math.max(-1, Math.min(1, next));
  }

  function jump() {
    if (state.jumpT <= 0) state.jumpT = 1;
  }

  function hitVirus() {
    if (state.invincible > 0) return;
    state.lives -= 1;
    state.invincible = 1.4;
    state.recoverTimer = 0;
    setAnim("hit");
    sfx("hit");
    updateHud();
    if (state.lives <= 0) endGame();
  }

  function collect(item) {
    if (item.type === "vaccine") {
      state.lives = Math.min(MAX_LIVES, state.lives + 1);
      state.recoverTimer = recoverDuration(state.character);
      setAnim("recover");
      sfx("recover");
    } else if (item.type === "chip") {
      state.score += 50;
      sfx("data");
    }
    updateHud();
  }

  function updateAnim(dt) {
    state.animTime += dt;

    if (state.recoverTimer > 0) {
      state.recoverTimer -= dt;
      setAnim("recover");
      if (state.recoverTimer <= 0) {
        if (state.invincible <= 0) setAnim("run");
      }
      return;
    }

    if (state.invincible > 0) {
      setAnim("hit");
      return;
    }

    if (state.anim !== "run") setAnim("run");
  }

  function currentFrame() {
    const clips = sprites[state.character]?.[state.anim] || sprites[state.character]?.run;
    if (!clips || !clips.length) return null;

    const meta = ANIM[state.anim] || ANIM.run;
    const frame = Math.floor(state.animTime * meta.fps);
    if (meta.loop) return clips[frame % clips.length];
    return clips[Math.min(frame, clips.length - 1)];
  }

  function update(dt) {
    state.distance += state.speed * 42 * dt;
    state.score += state.speed * 18 * dt;
    state.speed = Math.min(0.48, 0.22 + state.distance / 1400);
    state.invincible = Math.max(0, state.invincible - dt);
    if (state.jumpT > 0) state.jumpT = Math.max(0, state.jumpT - dt * 1.7);

    updateAnim(dt);

    const laneDiff = state.targetLane - state.lane;
    state.lane += Math.sign(laneDiff) * Math.min(Math.abs(laneDiff), dt * 8);

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnObject();
      state.spawnTimer = Math.max(0.42, 0.92 - state.distance / 1800);
    }

    const jumping = state.jumpT > 0.12;
    state.objects.forEach((item) => {
      item.z += state.speed * dt;
      if (item.z > 0.86 && item.z < 1.02 && Math.round(item.lane) === Math.round(state.targetLane)) {
        if (item.type === "virus" && !jumping) {
          hitVirus();
          item.hit = true;
        } else if (item.type !== "virus") {
          collect(item);
          item.hit = true;
        }
      }
    });
    state.objects = state.objects.filter((item) => item.z < 1.08 && !item.hit);
    updateHud();
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, "#091428");
    g.addColorStop(0.45, "#12082a");
    g.addColorStop(1, "#050814");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(92, 240, 255, 0.18)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= 12; i += 1) {
      const z = i / 12;
      const left = project(-1.15, z);
      const right = project(1.15, z);
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();
    }

    LANES.forEach((lane) => {
      const far = project(lane, 0);
      const near = project(lane, 1);
      ctx.beginPath();
      ctx.strokeStyle = "rgba(125, 139, 255, 0.35)";
      ctx.moveTo(far.x, far.y);
      ctx.lineTo(near.x, near.y);
      ctx.stroke();
    });
  }

  function drawFallback(character, x, y, size) {
    ctx.save();
    ctx.translate(x, y - size * 0.42);
    ctx.fillStyle = character === "oreu" ? "#f4f1ee" : "#ffd000";
    ctx.beginPath();
    ctx.ellipse(0, 8, size * 0.34, size * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3aa0ff";
    ctx.fillRect(-size * 0.28, -size * 0.28, size * 0.56, size * 0.12);
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(-size * 0.1, -size * 0.08, size * 0.035, 0, Math.PI * 2);
    ctx.arc(size * 0.1, -size * 0.08, size * 0.035, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function recoverScale() {
    if (state.anim !== "recover" || state.recoverTimer <= 0) return 1;
    const total = recoverDuration(state.character);
    const t = 1 - state.recoverTimer / total;
    return 1 + Math.sin(t * Math.PI) * 0.12;
  }

  function drawSprite(character, x, y, size, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;

    const bounce = recoverScale();
    const drawSize = size * bounce;

    ctx.fillStyle = "rgba(20, 28, 48, 0.35)";
    ctx.beginPath();
    ctx.ellipse(x, y - 8, drawSize * 0.28, drawSize * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    const img = currentFrame();
    if (img && img.complete && img.naturalWidth > 0) {
      const h = drawSize;
      const w = drawSize * (img.naturalWidth / img.naturalHeight);
      ctx.drawImage(img, x - w / 2, y - h, w, h);
    } else {
      drawFallback(character, x, y, drawSize);
    }
    ctx.restore();
  }

  function drawVirus(x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#7cff6b";
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d6ff4a";
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI * 2 * i) / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * size * 0.2, Math.sin(a) * size * 0.2);
      ctx.lineTo(Math.cos(a) * size * 0.48, Math.sin(a) * size * 0.48);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawVaccine(x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#5cf0ff";
    ctx.fillRect(-size * 0.12, -size * 0.34, size * 0.24, size * 0.55);
    ctx.fillStyle = "#7dffb1";
    ctx.beginPath();
    ctx.arc(0, size * 0.28, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(-size * 0.2, -size * 0.08, size * 0.4, size * 0.08);
    ctx.restore();
  }

  function drawChip(x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#ffe46a";
    ctx.fillRect(-size * 0.22, -size * 0.22, size * 0.44, size * 0.44);
    ctx.fillStyle = "#16203a";
    ctx.font = `${Math.max(10, size * 0.28)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.rotate(-Math.PI / 4);
    ctx.fillText("</>", 0, 0);
    ctx.restore();
  }

  function draw() {
    drawBackground();

    const sorted = [...state.objects].sort((a, b) => a.z - b.z);
    sorted.forEach((item) => {
      const p = project(item.lane, item.z);
      const size = 28 + p.scale * 42;
      if (item.type === "virus") drawVirus(p.x, p.y, size);
      if (item.type === "vaccine") drawVaccine(p.x, p.y, size);
      if (item.type === "chip") drawChip(p.x, p.y, size);
    });

    const player = project(state.lane, 0.9);
    const jumpLift = Math.sin(state.jumpT * Math.PI) * 70;
    const blink = state.invincible > 0 && state.anim === "hit" && Math.floor(state.invincible * 12) % 2 === 0;
    drawSprite(
      state.character,
      player.x,
      player.y - jumpLift,
      110 + player.scale * 40,
      blink ? 0.45 : 1
    );
  }

  function loop(time) {
    if (!state.running) return;
    const dt = state.lastTime ? Math.min(0.033, (time - state.lastTime) / 1000) : 0.016;
    state.lastTime = time;
    update(dt);
    draw();
    if (state.running) requestAnimationFrame(loop);
  }

  charCards.forEach((btn) => {
    btn.addEventListener("click", () => resetGame(btn.dataset.character));
  });

  document.getElementById("retry-btn").addEventListener("click", () => {
    resetGame(state.lastCharacter);
  });

  document.getElementById("home-btn").addEventListener("click", () => {
    state.running = false;
    show("select");
    window.gameAudio?.playBgm("lobby");
  });

  const muteBtn = document.getElementById("mute-btn");
  if (muteBtn) {
    muteBtn.addEventListener("click", () => {
      const muted = window.gameAudio?.toggleMute();
      muteBtn.textContent = muted ? "🔇" : "🔊";
      muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
    });
  }

  window.addEventListener("keydown", (event) => {
    if (state.screen !== "play") return;
    if (event.key === "ArrowLeft" || event.key === "a") setLane(state.targetLane - 1);
    if (event.key === "ArrowRight" || event.key === "d") setLane(state.targetLane + 1);
    if (event.key === "ArrowUp" || event.key === " ") {
      event.preventDefault();
      jump();
    }
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (state.screen !== "play") return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (y < rect.height * 0.28) jump();
    else if (x < rect.width / 2) setLane(state.targetLane - 1);
    else setLane(state.targetLane + 1);
  });

  setCardsEnabled(false);
  Promise.all([loadAllSprites(), processSelectPhotos()]).finally(() => setCardsEnabled(true));

  setTimeout(() => setCardsEnabled(true), 2500);
})();
