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

  function draw() {
    const calm = state.calm || document.documentElement.classList.contains("reduce-motion");
    ctx.clearRect(0, 0, 960, 420);
    const sky = ctx.createLinearGradient(0, 0, 0, 280);
    sky.addColorStop(0, "#c5e7f6");
    sky.addColorStop(1, "#f7f1e4");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 960, 420);

    const shift = calm ? 0 : state.distance;
    ctx.fillStyle = "#d7ebc0";
    hill(80 - (shift * 0.15) % 520, 250, 280);
    hill(420 - (shift * 0.15) % 520, 265, 240);
    hill(760 - (shift * 0.15) % 520, 248, 300);
    ctx.fillStyle = "#8fb56a";
    hill(20 - (shift * 0.28) % 480, 300, 220);
    hill(360 - (shift * 0.28) % 480, 292, 200);
    hill(700 - (shift * 0.28) % 480, 305, 240);

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
      if (x < -160 || x > 1040) continue;
      if (ob.kind === "puddle") {
        ctx.fillStyle = "#7eb7d8";
        ctx.beginPath();
        ctx.ellipse(x + ob.w / 2, 326, ob.w / 2, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        ctx.ellipse(x + ob.w * 0.38, 322, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#8a5a32";
        roundRect(x, 312 - ob.h + 18, ob.w, ob.h, 12);
        ctx.fillStyle = "#6b4423";
        roundRect(x + 8, 318 - ob.h + 18, ob.w - 22, 8, 6);
      }
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

    drawWillard(PLAYER_SCREEN_X, 318 - state.y, calm ? 0 : state.distance);
    progress.value = Math.max(0, Math.min(100, Math.round((state.distance / state.finishAt) * 100)));
    progress.textContent = `${progress.value} percent of the path`;
    if (overlay) overlay.hidden = state.status === "playing" || state.status === "paused";
  }

  function hill(x, y, w) {
    ctx.beginPath();
    ctx.moveTo(x, 330);
    ctx.quadraticCurveTo(x + w / 2, y, x + w, 330);
    ctx.fill();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function drawWillard(x, foot, travel) {
    const bob = state.status === "playing" && state.onGround ? Math.sin(travel / 18) * 2 : 0;
    const y = foot + bob;
    ctx.strokeStyle = "#24170f";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    const legs = [
      [-34, -8, -52, 6],
      [-28, -2, -46, 16],
      [-18, 2, -24, 18],
      [-8, 4, -4, 16],
      [8, 4, 6, 16],
      [16, 2, 26, 18],
      [26, -2, 46, 14],
      [32, -8, 52, 4],
    ];
    for (const [x1, y1, x2, y2] of legs) {
      ctx.beginPath();
      ctx.moveTo(x + x1, y - 28 + y1);
      ctx.lineTo(x + x2, y - 8 + y2);
      ctx.stroke();
    }
    ctx.fillStyle = "#c4844a";
    ctx.beginPath();
    ctx.ellipse(x, y - 36, 28, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9d2b1e";
    ctx.beginPath();
    ctx.ellipse(x, y - 52, 22, 12, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#f0b429";
    ctx.beginPath();
    ctx.arc(x - 8, y - 58, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2c2118";
    ctx.beginPath();
    ctx.arc(x - 8, y - 38, 3.2, 0, Math.PI * 2);
    ctx.arc(x + 10, y - 38, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x - 7, y - 39, 1.1, 0, Math.PI * 2);
    ctx.arc(x + 11, y - 39, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2c2118";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 1, y - 30, 7, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.fillStyle = "#2f6eae";
    roundRect(x - 16, y - 16, 14, 10, 3);
    roundRect(x + 4, y - 16, 14, 10, 3);
    ctx.fillStyle = "#f7f7f7";
    roundRect(x - 16, y - 8, 14, 5, 2);
    roundRect(x + 4, y - 8, 14, 5, 2);
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
