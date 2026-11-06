import assert from "node:assert/strict";
import test from "node:test";
import { entries } from "../js/crossword-data.js";
import {
  activeEntry,
  buildSolution,
  cellKey,
  checkPuzzle,
  createPuzzle,
  entryCells,
  hint,
  resetPuzzle,
  typeLetter,
  wordBank,
} from "../js/crossword-model.js";

test("every crossing letter agrees", () => {
  const { solution, owners } = buildSolution();
  assert.ok(Object.keys(solution).length > 20);
  const shared = Object.values(owners).filter((list) => list.length > 1);
  assert.ok(shared.length >= 8);
});

test("a bad crossing is rejected", () => {
  const broken = entries.map((entry) => ({ ...entry }));
  broken[0] = { ...broken[0], answer: "XXXX" };
  assert.throws(() => buildSolution(broken), /Crossing mismatch/);
});

test("typing fills one square and the crossing word sees it", () => {
  let state = createPuzzle();
  const bark = entries.find((entry) => entry.id === "2a");
  state = { ...state, active: { row: bark.row, col: bark.col }, direction: "across" };
  for (const letter of "BARK") state = typeLetter(state, letter);
  const park = entries.find((entry) => entry.id === "1d");
  const parkR = entryCells(park)[2];
  const key = cellKey(parkR.row, parkR.col);
  assert.equal(state.letters[key], "R");
  assert.equal(state.solution[key], "R");
  const checked = checkPuzzle(state);
  assert.equal(checked.marks[key], "ok");
});

test("a wrong letter is marked gently and can be cleared", () => {
  let state = createPuzzle();
  state = typeLetter(state, "Z");
  const key = cellKey(state.active.row, state.active.col);
  const before = checkPuzzle({ ...state, active: state.active });
  const typedKey = Object.keys(state.letters)[0];
  assert.equal(before.marks[typedKey], "no");
  assert.match(before.message, /another look/);
  state = resetPuzzle(state);
  assert.deepEqual(state.letters, {});
  assert.equal(key.length > 0, true);
});

test("hint reveals a single letter", () => {
  const state = createPuzzle();
  const hinted = hint(state);
  const filled = Object.values(hinted.letters);
  assert.equal(filled.length, 1);
  assert.equal(filled[0], hinted.solution[cellKey(hinted.active.row, hinted.active.col)] || filled[0]);
});

test("word bank is the Book One answer list", () => {
  const bank = wordBank();
  assert.deepEqual(bank, ["AMY", "BALL", "BARK", "BUTCH", "CAP", "DUCKS", "HILL", "PARK", "SNEAKERS", "WEB", "WILLARD"]);
  assert.equal(bank.includes("KIM"), false);
  assert.equal(bank.includes("CHERRY"), false);
  assert.equal(activeEntry(createPuzzle()).answer, "PARK");
});
