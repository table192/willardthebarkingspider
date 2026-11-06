const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

const calmButton = document.querySelector("[data-calm]");
const media = window.matchMedia("(prefers-reduced-motion: reduce)");

function storedCalm() {
  try {
    return sessionStorage.getItem("willard-calm");
  } catch {
    return null;
  }
}

export function motionIsCalm() {
  const stored = storedCalm();
  if (stored === "1") return true;
  if (stored === "0") return false;
  return media.matches;
}

function applyCalm() {
  const calm = motionIsCalm();
  document.documentElement.classList.toggle("reduce-motion", calm);
  if (calmButton) {
    calmButton.setAttribute("aria-pressed", calm ? "true" : "false");
    calmButton.textContent = calm ? "Calm motion on" : "Calm motion";
  }
}

if (calmButton) {
  calmButton.addEventListener("click", () => {
    const next = !motionIsCalm();
    try {
      sessionStorage.setItem("willard-calm", next ? "1" : "0");
    } catch {
      /* This tab can still use the choice for the current page. */
    }
    applyCalm();
    document.dispatchEvent(new CustomEvent("willard-calm"));
  });
}

applyCalm();
media.addEventListener?.("change", () => {
  if (storedCalm() === null) applyCalm();
});
