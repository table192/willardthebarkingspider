import { entries } from "./crossword-data.js";
import {
  activeEntry,
  cellKey,
  checkPuzzle,
  createPuzzle,
  entryCells,
  erase,
  focusEntry,
  hint,
  move,
  resetPuzzle,
  selectCell,
  startNumbers,
  typeLetter,
  wordBank,
} from "./crossword-model.js";

const root = document.querySelector("[data-crossword]");
if (root) {
  const grid = root.querySelector("[data-grid]");
  const clues = root.querySelector("[data-clues]");
  const status = root.querySelector("[data-status]");
  const bank = root.querySelector("[data-bank]");
  const keys = root.querySelector("[data-keys]");
  let state = createPuzzle();
  const numbers = startNumbers();

  function paint() {
    const entry = activeEntry(state);
    const entryCellsNow = entry ? entryCells(entry) : [];
    for (const button of grid.querySelectorAll("[data-cell]")) {
      const row = Number(button.dataset.row);
      const col = Number(button.dataset.col);
      const key = cellKey(row, col);
      const letter = state.letters[key] || "";
      const mark = state.marks[key] || "";
      const selected = state.active.row === row && state.active.col === col;
      const inWord = entryCellsNow.some((cell) => cell.row === row && cell.col === col);
      let glyph = button.querySelector(".cell-letter");
      if (!glyph) {
        glyph = document.createElement("span");
        glyph.className = "cell-letter";
        button.append(glyph);
      }
      glyph.textContent = letter;
      button.classList.toggle("is-selected", selected);
      button.classList.toggle("is-word", inWord && !selected);
      button.classList.toggle("is-ok", mark === "ok");
      button.classList.toggle("is-no", mark === "no");
      button.tabIndex = selected ? 0 : -1;
      button.setAttribute("aria-selected", selected ? "true" : "false");
      const number = numbers[key] ? `Number ${numbers[key]}. ` : "";
      const shown = letter ? `Letter ${letter}.` : "Empty.";
      const checked = mark === "ok" ? " Looks right." : mark === "no" ? " Take another look." : "";
      button.setAttribute("aria-label", `${number}Row ${row + 1}, column ${col + 1}. ${shown}${checked}`);
      const badge = button.querySelector(".cell-num");
      if (badge) badge.textContent = numbers[key] || "";
    }
    for (const button of clues.querySelectorAll("[data-entry]")) {
      button.setAttribute("aria-current", entry && button.dataset.entry === entry.id ? "true" : "false");
    }
    status.textContent = state.message;
  }

  function build() {
    grid.style.setProperty("--cols", String(state.cols));
    for (let row = 0; row < state.rows; row += 1) {
      const line = document.createElement("div");
      line.className = "xw-row";
      line.setAttribute("role", "row");
      for (let col = 0; col < state.cols; col += 1) {
        const key = cellKey(row, col);
        if (!state.solution[key]) {
          const blank = document.createElement("span");
          blank.className = "xw-blank";
          blank.setAttribute("aria-hidden", "true");
          line.append(blank);
          continue;
        }
        const button = document.createElement("button");
        button.type = "button";
        button.className = "xw-cell";
        button.dataset.cell = key;
        button.dataset.row = String(row);
        button.dataset.col = String(col);
        button.setAttribute("role", "gridcell");
        const badge = document.createElement("span");
        badge.className = "cell-num";
        badge.setAttribute("aria-hidden", "true");
        button.append(badge);
        button.addEventListener("click", () => {
          state = selectCell(state, row, col);
          paint();
          button.focus();
        });
        line.append(button);
      }
      grid.append(line);
    }

    const groups = [
      ["Across", entries.filter((entry) => entry.dir === "across")],
      ["Down", entries.filter((entry) => entry.dir === "down")],
    ];
    for (const [label, list] of groups) {
      const wrap = document.createElement("div");
      const heading = document.createElement("h3");
      heading.textContent = label;
      const menu = document.createElement("ol");
      menu.className = "clue-list";
      for (const entry of list) {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.entry = entry.id;
        button.innerHTML = `<span class="clue-num">${entry.number}</span> ${entry.clue} <span class="clue-len">(${entry.answer.length})</span>`;
        button.addEventListener("click", () => {
          state = focusEntry(state, entry.id);
          paint();
          grid.querySelector(".is-selected")?.focus();
        });
        item.append(button);
        menu.append(item);
      }
      wrap.append(heading, menu);
      clues.append(wrap);
    }

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (const letter of alphabet) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "key";
      button.textContent = letter;
      button.setAttribute("aria-label", `Type ${letter}`);
      button.addEventListener("click", () => {
        state = typeLetter(state, letter);
        paint();
      });
      keys.append(button);
    }
    bank.textContent = wordBank().join("  ·  ");
    paint();
  }

  grid.addEventListener("keydown", (event) => {
    const key = event.key;
    if (/^[a-zA-Z]$/.test(key) && key.length === 1) {
      event.preventDefault();
      state = typeLetter(state, key);
      paint();
      return;
    }
    const arrows = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    if (arrows[key]) {
      event.preventDefault();
      const [dRow, dCol] = arrows[key];
      state = move(state, dRow, dCol);
      paint();
      grid.querySelector(".is-selected")?.focus();
      return;
    }
    if (key === "Backspace") {
      event.preventDefault();
      state = erase(state);
      paint();
      grid.querySelector(".is-selected")?.focus();
    }
  });

  root.querySelector("[data-hint]").addEventListener("click", () => {
    state = hint(state);
    paint();
  });
  root.querySelector("[data-check]").addEventListener("click", () => {
    state = checkPuzzle(state);
    paint();
  });
  root.querySelector("[data-reset]").addEventListener("click", () => {
    state = resetPuzzle(state);
    paint();
  });
  root.querySelector("[data-bank-toggle]").addEventListener("click", () => {
    const open = bank.hasAttribute("hidden");
    if (open) bank.removeAttribute("hidden");
    else bank.setAttribute("hidden", "");
    root.querySelector("[data-bank-toggle]").setAttribute("aria-expanded", open ? "true" : "false");
  });

  build();
}
