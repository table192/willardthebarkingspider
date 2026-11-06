export const PLAYER_SCREEN_X = 128;
export const HIT_W = 26;

const GRAVITY = -420;
const JUMP_V = 310;
const COYOTE = 0.2;
const BUFFER = 0.2;

function course() {
  return [
    { id: "log-1", x: 760, w: 86, h: 34, kind: "log" },
    { id: "puddle-1", x: 1280, w: 110, h: 24, kind: "puddle" },
    { id: "log-2", x: 1820, w: 86, h: 36, kind: "log" },
    { id: "puddle-2", x: 2400, w: 120, h: 24, kind: "puddle" },
    { id: "log-3", x: 3000, w: 90, h: 32, kind: "log" },
    { id: "puddle-3", x: 3580, w: 110, h: 26, kind: "puddle" },
    { id: "log-4", x: 4140, w: 86, h: 34, kind: "log" },
  ];
}

function clone(state) {
  return {
    ...state,
    obstacles: state.obstacles.map((ob) => ({ ...ob })),
  };
}

export function createRun(options = {}) {
  const calm = Boolean(options.calm);
  return {
    status: "ready",
    y: 0,
    vy: 0,
    onGround: true,
    coyote: COYOTE,
    buffer: 0,
    distance: 0,
    speed: calm ? 140 : 190,
    recover: 0,
    calm,
    finishAt: 4700,
    message: "Press Start, then hop over the logs and puddles.",
    lastEvent: "",
    obstacles: course(),
    hops: 0,
    stumbles: 0,
    ignoreId: "",
    ignoreFor: 0,
  };
}

export function playerLeft(state) {
  return state.distance + PLAYER_SCREEN_X - HIT_W / 2;
}

export function hitsObstacle(state, ob) {
  if (state.ignoreFor > 0 && state.ignoreId === ob.id) return false;
  if (state.y >= ob.h - 2) return false;
  const left = playerLeft(state);
  const right = left + HIT_W;
  const inset = Math.min(18, ob.w * 0.22);
  return right > ob.x + inset && left < ob.x + ob.w - inset;
}

export function startRun(state) {
  if (state.status === "playing") return state;
  const next = state.status === "finished" ? createRun({ calm: state.calm }) : clone(state);
  next.status = "playing";
  next.message = "Hop when a log or a puddle gets close.";
  next.lastEvent = "start";
  return next;
}

export function pauseRun(state) {
  if (state.status !== "playing" && state.status !== "paused") return state;
  const next = clone(state);
  if (next.status === "playing") {
    next.status = "paused";
    next.message = "Paused. The path will wait for you.";
    next.lastEvent = "pause";
  } else {
    next.status = "playing";
    next.message = "Off we go.";
    next.lastEvent = "resume";
  }
  return next;
}

export function restartRun(state) {
  const next = createRun({ calm: state.calm });
  next.status = "playing";
  next.message = "A fresh start across the park.";
  next.lastEvent = "restart";
  return next;
}

export function step(state, dt, input = {}) {
  if (state.status !== "playing") return state;
  const next = clone(state);
  const t = Math.max(0, Math.min(dt, 0.05));

  if (input.jumpPressed) next.buffer = BUFFER;
  else next.buffer = Math.max(0, next.buffer - t);

  if (next.onGround) next.coyote = COYOTE;
  else next.coyote = Math.max(0, next.coyote - t);

  const canJump = next.buffer > 0 && next.recover <= 0 && (next.onGround || next.coyote > 0);
  if (canJump) {
    next.vy = JUMP_V;
    next.onGround = false;
    next.coyote = 0;
    next.buffer = 0;
    next.hops += 1;
    next.lastEvent = "hop";
  }

  next.vy += GRAVITY * t;
  next.y += next.vy * t;
  if (next.y <= 0) {
    next.y = 0;
    next.vy = 0;
    next.onGround = true;
  }

  next.distance += next.speed * t;
  next.recover = Math.max(0, next.recover - t);
  next.ignoreFor = Math.max(0, next.ignoreFor - t);

  if (next.recover <= 0) {
    for (const ob of next.obstacles) {
      if (!hitsObstacle(next, ob)) continue;
      next.distance = Math.max(0, ob.x - PLAYER_SCREEN_X - HIT_W / 2 - 130);
      next.y = 0;
      next.vy = 0;
      next.onGround = true;
      next.recover = 0.28;
      next.ignoreId = ob.id;
      next.ignoreFor = 1.15;
      next.stumbles += 1;
      next.lastEvent = "stumble";
      next.message = "Almost! Hop again. Willard is still on the path.";
      break;
    }
  }

  if (next.distance + PLAYER_SCREEN_X >= next.finishAt && next.recover <= 0) {
    next.status = "finished";
    next.lastEvent = "finish";
    next.message = "Willard crossed the park. Butch wags hello.";
  }
  return next;
}
