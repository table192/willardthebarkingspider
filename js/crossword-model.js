import { COLS, ROWS, entries } from "./crossword-data.js";

export function cellKey(row, col) {
  return `${row},${col}`;
}

export function entryCells(entry) {
  const cells = [];
  const dr = entry.dir === "down" ? 1 : 0;
  const dc = entry.dir === "across" ? 1 : 0;
  for (let i = 0; i < entry.answer.length; i += 1) {
    cells.push({
      row: entry.row + dr * i,
      col: entry.col + dc * i,
      letter: entry.answer[i],
    });
  }
  return cells;
}

export function buildSolution(list = entries) {
  const solution = {};
  const owners = {};
  for (const entry of list) {
    for (const cell of entryCells(entry)) {
      const key = cellKey(cell.row, cell.col);
      if (solution[key] && solution[key] !== cell.letter) {
        throw new Error(`Crossing mismatch at ${key}: ${solution[key]} vs ${cell.letter}`);
      }
      solution[key] = cell.letter;
      if (!owners[key]) owners[key] = [];
      owners[key].push(entry.id);
    }
  }
  return { solution, owners };
}

export function createPuzzle() {
  const { solution, owners } = buildSolution();
  const first = entries[0];
  return {
    rows: ROWS,
    cols: COLS,
    solution,
    owners,
    letters: {},
    marks: {},
    active: { row: first.row, col: first.col },
    direction: first.dir,
    message: "Tap a square, then type a letter. Shared squares belong to both words.",
  };
}

export function entriesAt(row, col) {
  const key = cellKey(row, col);
  return entries.filter((entry) => entryCells(entry).some((cell) => cellKey(cell.row, cell.col) === key));
}

export function activeEntry(state) {
  const at = entriesAt(state.active.row, state.active.col);
  return at.find((entry) => entry.dir === state.direction) || at[0] || null;
}

function clueText(row, col, direction) {
  const at = entriesAt(row, col);
  const entry = at.find((item) => item.dir === direction) || at[0];
  if (!entry) return "";
  const label = entry.dir === "across" ? "Across" : "Down";
  return `${entry.number} ${label}. ${entry.clue}`;
}

export function selectCell(state, row, col, direction) {
  if (!state.solution[cellKey(row, col)]) return state;
  const at = entriesAt(row, col);
  let dir = direction;
  if (!dir) {
    const same = state.active.row === row && state.active.col === col;
    if (same) {
      const flipped = state.direction === "across" ? "down" : "across";
      dir = at.some((entry) => entry.dir === flipped) ? flipped : state.direction;
    } else {
      dir = at.some((entry) => entry.dir === state.direction) ? state.direction : at[0].dir;
    }
  }
  return {
    ...state,
    active: { row, col },
    direction: dir,
    message: clueText(row, col, dir),
  };
}

export function typeLetter(state, raw) {
  const letter = String(raw || "").toUpperCase();
  if (!/^[A-Z]$/.test(letter)) return state;
  const key = cellKey(state.active.row, state.active.col);
  if (!state.solution[key]) return state;
  const letters = { ...state.letters, [key]: letter };
  const marks = { ...state.marks };
  delete marks[key];
  let next = { ...state, letters, marks };
  const entry = activeEntry(next);
  if (entry) {
    const cells = entryCells(entry);
    const index = cells.findIndex((cell) => cell.row === state.active.row && cell.col === state.active.col);
    const following = cells[index + 1];
    if (following) next = { ...next, active: { row: following.row, col: following.col } };
  }
  next.message = clueText(next.active.row, next.active.col, next.direction);
  return next;
}

export function erase(state) {
  const key = cellKey(state.active.row, state.active.col);
  const letters = { ...state.letters };
  const marks = { ...state.marks };
  if (letters[key]) {
    delete letters[key];
    delete marks[key];
    return { ...state, letters, marks, message: "Letter cleared." };
  }
  const entry = activeEntry(state);
  if (!entry) return state;
  const cells = entryCells(entry);
  const index = cells.findIndex((cell) => cell.row === state.active.row && cell.col === state.active.col);
  const previous = cells[index - 1];
  if (!previous) return state;
  const previousKey = cellKey(previous.row, previous.col);
  delete letters[previousKey];
  delete marks[previousKey];
  return {
    ...state,
    letters,
    marks,
    active: { row: previous.row, col: previous.col },
    message: "Letter cleared.",
  };
}

export function move(state, dRow, dCol) {
  let row = state.active.row + dRow;
  let col = state.active.col + dCol;
  while (row >= 0 && col >= 0 && row < state.rows && col < state.cols) {
    if (state.solution[cellKey(row, col)]) {
      const dir = dCol !== 0 ? "across" : "down";
      const at = entriesAt(row, col);
      const useDir = at.some((entry) => entry.dir === dir) ? dir : state.direction;
      return selectCell(state, row, col, useDir);
    }
    row += dRow;
    col += dCol;
  }
  return state;
}

export function hint(state) {
  const entry = activeEntry(state);
  if (!entry) return state;
  const cells = entryCells(entry);
  const target = cells.find((cell) => state.letters[cellKey(cell.row, cell.col)] !== cell.letter) || cells[0];
  const key = cellKey(target.row, target.col);
  const letters = { ...state.letters, [key]: state.solution[key] };
  const marks = { ...state.marks };
  delete marks[key];
  return {
    ...state,
    letters,
    marks,
    active: { row: target.row, col: target.col },
    message: `A hint for you: the letter ${state.solution[key]}.`,
  };
}

export function checkPuzzle(state) {
  const marks = {};
  let wrong = 0;
  let filled = 0;
  for (const key of Object.keys(state.solution)) {
    const letter = state.letters[key];
    if (!letter) continue;
    filled += 1;
    if (letter === state.solution[key]) marks[key] = "ok";
    else {
      marks[key] = "no";
      wrong += 1;
    }
  }
  let message = "Type a few letters, then press Check.";
  if (filled && wrong === 0) {
    const total = Object.keys(state.solution).length;
    message = filled === total
      ? "The whole web is filled in. Nice work."
      : "Every letter you wrote is in the right square.";
  } else if (wrong === 1) {
    message = "One letter wants another look.";
  } else if (wrong > 1) {
    message = `${wrong} letters want another look.`;
  }
  return { ...state, marks, message };
}

export function resetPuzzle(state) {
  return {
    ...state,
    letters: {},
    marks: {},
    message: "Cleared. The clues are still here whenever you are ready.",
  };
}

export function focusEntry(state, entryId) {
  const entry = entries.find((item) => item.id === entryId);
  if (!entry) return state;
  return selectCell(state, entry.row, entry.col, entry.dir);
}

export function wordBank() {
  return [...new Set(entries.map((entry) => entry.answer))].sort();
}

export function startNumbers() {
  const numbers = {};
  for (const entry of entries) {
    const key = cellKey(entry.row, entry.col);
    if (!numbers[key]) numbers[key] = entry.number;
  }
  return numbers;
}
