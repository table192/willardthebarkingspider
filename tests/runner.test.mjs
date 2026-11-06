import assert from "node:assert/strict";
import test from "node:test";
import {
  createRun,
  pauseRun,
  playerLeft,
  restartRun,
  startRun,
  step,
} from "../js/runner-model.js";

test("a missed hop sets Willard back and keeps the game going", () => {
  let state = startRun(createRun());
  for (let i = 0; i < 600 && state.stumbles === 0; i += 1) {
    state = step(state, 1 / 60, {});
  }
  assert.ok(state.stumbles >= 1);
  assert.equal(state.status, "playing");
  assert.ok(playerLeft(state) + 26 < state.obstacles[0].x);
  assert.match(state.message, /Hop again/);
});

test("a hop clears the first log", () => {
  let state = startRun(createRun());
  const log = state.obstacles[0];
  for (let i = 0; i < 400; i += 1) {
    const gap = log.x - (playerLeft(state) + 26);
    if (gap < 150) break;
    state = step(state, 1 / 60, {});
  }
  state = step(state, 1 / 60, { jumpPressed: true });
  for (let i = 0; i < 90; i += 1) state = step(state, 1 / 60, {});
  assert.equal(state.stumbles, 0);
  assert.ok(playerLeft(state) > log.x + log.w);
});

test("pause holds the path and restart begins again", () => {
  let state = startRun(createRun());
  state = step(state, 1 / 60, {});
  const distance = state.distance;
  state = pauseRun(state);
  state = step(state, 1, {});
  assert.equal(state.status, "paused");
  assert.equal(state.distance, distance);
  state = restartRun(state);
  assert.equal(state.status, "playing");
  assert.equal(state.distance, 0);
  assert.equal(state.stumbles, 0);
});

test("holding hop can finish the path without a hard fail", () => {
  let state = startRun(createRun());
  for (let i = 0; i < 2500 && state.status === "playing"; i += 1) {
    state = step(state, 1 / 60, { jumpPressed: true });
  }
  assert.equal(state.status, "finished");
  assert.match(state.message, /Butch/);
});
