import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = ["index.html", "book-one.html", "book-two.html", "games.html", "author.html", "404.html"];

function read(name) {
  return readFileSync(join(root, name), "utf8");
}

test("pages exist and do not publish private research", () => {
  const banned = ["blitz6", "table192@", "drive.google", "EARLY_DRAFT", "PROVENANCE", "Cherry", "CHERRY"];
  for (const page of pages) {
    const html = read(page);
    for (const word of banned) assert.equal(html.includes(word), false, `${page} contains ${word}`);
  }
  assert.equal(existsSync(join(root, "CNAME")), false);
});

test("book one keeps the published story and the working Amazon link", () => {
  const html = read("book-one.html");
  assert.match(html, /https:\/\/www\.amazon\.com\/dp\/B0GWR9JBZ9/);
  assert.match(html, /Logan, Maurizio, and Amy/);
  assert.match(html, /baseball cap, a pair of sneakers, and a shiny bottle cap/);
  assert.match(html, /So this is the big world outside the barn/);
  assert.match(html, /mailto:info@willardthebarkingspider\.com/);
  assert.match(html, /Mario J\. Pirrello/);
});

test("book two is separate, coming soon, and has no purchase link", () => {
  const html = read("book-two.html");
  assert.equal(html.includes("amazon.com"), false);
  assert.match(html, /A Festival Comes to the Park/);
  assert.match(html, /Mario J\. Pirrello/);
  assert.match(html, /Kim/);
  assert.match(html, /Friendship Festival/);
  assert.match(html, /Coming soon/);
  assert.match(html, /controls/);
  assert.equal(/\bautoplay\b/i.test(html), false);
  assert.match(html, /book-two-preview\.mp4/);
});

test("games page has both games and no store", () => {
  const html = read("games.html");
  assert.match(html, /data-runner/);
  assert.match(html, /data-crossword/);
  assert.equal(html.includes("amazon.com"), false);
  assert.match(html, /Book One/);
});

test("local links and images resolve", () => {
  const external = /^(https?:|mailto:|tel:|#)/;
  for (const page of pages) {
    const html = read(page);
    const refs = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
    for (const ref of refs) {
      if (external.test(ref) || ref.startsWith("data:")) continue;
      const clean = decodeURIComponent(ref.split("#")[0].split("?")[0]);
      const path = normalize(join(root, clean));
      assert.equal(existsSync(path), true, `${page} -> ${ref}`);
      assert.equal(statSync(path).isFile(), true, `${page} -> ${ref}`);
    }
  }
});

test("no unexpected third-party hosts", () => {
  for (const page of pages) {
    const html = read(page);
    assert.equal(html.includes("fonts.googleapis"), false);
    assert.equal(html.includes("googletagmanager"), false);
    assert.equal(html.includes("google-analytics"), false);
  }
  const css = read("css/site.css");
  assert.equal(css.includes("http"), false);
});

test("theme art is the supplied Willard and scenery", () => {
  const pages = ["index.html", "book-one.html", "book-two.html", "games.html", "author.html", "404.html"];
  for (const page of pages) {
    const html = read(page);
    assert.match(html, /assets\/theme\/willard-mark\.webp/);
    assert.match(html, /assets\/theme\/willard-32\.png/);
    assert.equal(html.includes("<svg"), false, page);
  }
  const css = read("css/site.css");
  const runner = read("js/runner.js");
  assert.match(css, /assets\/theme\/park-bg\.webp/);
  assert.match(css, /opacity:\s*0\.2/);
  for (const file of ["assets/game/willard.webp", "assets/game/sky.webp", "assets/game/log.webp", "assets/game/puddle.webp"]) {
    assert.match(runner, new RegExp(file.replaceAll("/", "\\/")));
  }
  for (const file of [
    "assets/theme/park-bg.webp",
    "assets/theme/willard-mark.webp",
    "assets/theme/willard-32.png",
    "assets/game/willard.webp",
    "assets/game/sky.webp",
    "assets/game/log.webp",
    "assets/game/puddle.webp",
  ]) {
    assert.equal(existsSync(join(root, file)), true, file);
  }
  assert.equal(runner.includes("ellipse"), false);
  assert.match(read("book-two.html"), /Coming soon/);
  assert.equal(read("book-two.html").includes("amazon.com"), false);
});

test("public book-two originals and site art are present", () => {
  for (const name of ["cover.webp", "story-day.webp", "story-kim.webp"]) {
    assert.equal(existsSync(join(root, "assets/book-two", name)), true);
  }
  for (const name of ["story-sunset.webp", "story-rules.webp", "story-waiting.webp", "title.webp"]) {
    assert.equal(existsSync(join(root, "assets/book-two", name)), false, name);
  }
  assert.equal(existsSync(join(root, "assets/site/hero.webp")), true);
  assert.equal(existsSync(join(root, "assets/site/games-path.webp")), true);
  const drafts = readdirSync(root, { recursive: true }).map(String).filter((name) => /EARLY_DRAFT|picture-book|RESEARCH/i.test(name));
  assert.deepEqual(drafts, []);
});
