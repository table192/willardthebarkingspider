import { motionIsCalm } from "./site.js";
import {
  PLAYER_SCREEN_X,
  createRun,
  pauseRun,
  restartRun,
  startRun,
  step,
} from "./runner-model.js";

const root = document.querySelector("[data-runner]");
if (root) {
  const canvas = root.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const status = root.querySelector("[data-status]");
  const progress = root.querySelector("progress");
  const overlay = root.querySelector("[data-overlay]");
  let state = createRun({ calm: motionIsCalm() });
  let frame = 0;
  let lastTime = 0;
  let jumpQueued = false;
  let announced = "";

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(960 * dpr);
    canvas.height = Math.round(420 * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function announce() {
    if (state.message === announced) return;
    announced = state.message;
    status.textContent = state.message;
  }

  const art = {
    sky: loadArt("assets/game/sky.webp"),
    log: loadArt("assets/game/log.webp"),
    puddle: loadArt("assets/game/puddle.webp"),
    willard: loadArt("assets/game/willard.webp"),
  };

  function loadArt(src) {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      image.ready = true;
      draw();
    };
    image.onerror = () => {
      image.failed = true;
    };
    image.src = src;
    return image;
  }

  function drawCover(image, dx, dy, dw, dh) {
    const imageRatio = image.width / image.height;
    const boxRatio = dw / dh;
    let sx = 0;
    let sy = 0;
    let sw = image.width;
    let sh = image.height;
    if (imageRatio > boxRatio) {
      sw = image.height * boxRatio;
      sx = (image.width - sw) / 2;
    } else {
      sh = image.width / boxRatio;
      sy = (image.height - sh) / 2;
    }
    ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  function draw() {
    const calm = state.calm || document.documentElement.classList.contains("reduce-motion");
    ctx.clearRect(0, 0, 960, 420);
    if (art.sky.ready) drawCover(art.sky, 0, 0, 960, 312);

    ctx.fillStyle = "#c4a574";
    ctx.fillRect(0, 318, 960, 102);
    ctx.fillStyle = "#6f8f45";
    ctx.fillRect(0, 312, 960, 18);
    ctx.strokeStyle = "rgba(255,250,240,0.45)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 348);
    ctx.lineTo(960, 348);
    ctx.stroke();

    for (const ob of state.obstacles) {
      const x = ob.x - state.distance;
      if (x < -180 || x > 1060) continue;
      const image = ob.kind === "puddle" ? art.puddle : art.log;
      if (!image.ready) continue;
      const dw = ob.w;
      const dh = dw * (image.height / image.width);
      const ground = ob.kind === "puddle" ? 334 : 330;
      ctx.drawImage(image, x, ground - dh, dw, dh);
    }

    const finishX = state.finishAt - state.distance;
    if (finishX < 1100 && finishX > -80) {
      ctx.fillStyle = "#9d2b1e";
      ctx.fillRect(finishX, 210, 8, 110);
      ctx.fillStyle = "#f0b429";
      ctx.beginPath();
      ctx.moveTo(finishX + 8, 214);
      ctx.lineTo(finishX + 78, 236);
      ctx.lineTo(finishX + 8, 258);
      ctx.closePath();
      ctx.fill();
    }

    drawWillard(PLAYER_SCREEN_X, 318 - state.y, calm ? 0 : state.distance, calm);
    progress.value = Math.max(0, Math.min(100, Math.round((state.distance / state.finishAt) * 100)));
    progress.textContent = `${progress.value} percent of the path`;
    if (overlay) overlay.hidden = state.status === "playing" || state.status === "paused";
  }

  function drawWillard(x, foot, travel, calm) {
    if (!art.willard.ready) return;
    const bob = !calm && state.status === "playing" && state.onGround ? Math.sin(travel / 18) * 2 : 0;
    const size = 112;
    const contentBottom = size * (240 / 256);
    ctx.drawImage(art.willard, x - size / 2, foot + bob - contentBottom, size, size);
  }

  function ensureLoop() {
    if (frame) return;
    lastTime = 0;
    frame = requestAnimationFrame(tick);
  }

  function tick(time) {
    const dt = lastTime ? (time - lastTime) / 1000 : 0;
    lastTime = time;
    if (state.status === "playing") {
      state = step(state, dt, { jumpPressed: jumpQueued });
      jumpQueued = false;
    }
    announce();
    draw();
    if (state.status === "playing") frame = requestAnimationFrame(tick);
    else frame = 0;
  }

  function hop() {
    if (state.status === "ready" || state.status === "finished") {
      state = startRun(state);
      ensureLoop();
    } else if (state.status === "paused") {
      state = pauseRun(state);
      ensureLoop();
    }
    jumpQueued = true;
  }

  root.querySelector("[data-start]").addEventListener("click", () => {
    state = startRun(state);
    announce();
    ensureLoop();
  });
  root.querySelector("[data-pause]").addEventListener("click", () => {
    state = pauseRun(state);
    announce();
    if (state.status === "playing") ensureLoop();
    else draw();
  });
  root.querySelector("[data-restart]").addEventListener("click", () => {
    state = restartRun(state);
    announce();
    ensureLoop();
  });
  root.querySelector("[data-hop]").addEventListener("click", hop);
  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    hop();
  });
  root.addEventListener("keydown", (event) => {
    if (event.target.closest("a, button, input, textarea, select")) return;
    if (event.key === " " || event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
      event.preventDefault();
      hop();
    }
  });

  document.addEventListener("willard-calm", () => {
    const calm = motionIsCalm();
    if (state.status === "ready") state = createRun({ calm });
    else state = { ...state, calm, speed: calm ? 140 : 190 };
    announce();
    draw();
  });

  window.addEventListener("resize", resize);
  resize();
  announce();
}
