"""motion-kit.js changeScreen: one screen gives way to the next without a frame that has no screen."""
import json
import shutil
import subprocess
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / "plugins/arkar-dev-standards/skills/arkar-ui-motion-design/assets/motion-kit.js"
PAGE = Path(__file__).parent / "fixtures" / "motion-kit"

DRIVER = r"""
const { chromium } = require("playwright");
(async () => {
  const [url] = process.argv.slice(1);
  const browser = await chromium.launch();
  const out = {};
  // Counts the frames in which the screen area shows nothing, while `run` changes the screen.
  const watched = (page, run) => page.evaluate(async (source) => {
    const main = document.getElementById("main");
    const bar = document.getElementById("bar");
    const facts = { blankFrames: 0, frames: 0, barMoved: false };
    const barTop = bar.getBoundingClientRect().top;
    let watching = true;
    const watch = () => {
      if (!watching) return;
      facts.frames += 1;
      const screen = main.firstElementChild;
      if (!screen || !screen.childElementCount || !screen.getBoundingClientRect().height) facts.blankFrames += 1;
      if (bar.getBoundingClientRect().top !== barTop || !bar.isConnected) facts.barMoved = true;
      requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
    const started = performance.now();
    const result = await new Function("kit", `return (${source})(kit)`)(window.kit);
    facts.took = Math.round(performance.now() - started);
    await new Promise((resolve) => setTimeout(resolve, 500));
    watching = false;
    return { ...facts, ...result, heading: main.querySelector("h1") ? main.querySelector("h1").textContent : null,
      focus: document.activeElement.tagName, scrollY: Math.round(scrollY), screens: main.childElementCount };
  }, run.toString());

  for (const [name, options] of [["moving", {}], ["reduced", { reducedMotion: "reduce" }]]) {
    const page = await (await browser.newContext({ viewport: { width: 1000, height: 700 }, ...options })).newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto(url, { waitUntil: "load" });
    await page.evaluate(() => {
      // The user has scrolled down and has the keyboard on a row of the old screen.
      scrollTo(0, 400);
      const row = document.querySelector("#main p");
      row.setAttribute("tabindex", "0");
      row.focus({ preventScroll: true });
    });
    out[name] = await watched(page, async (kit) => {
      const before = kit.main.firstElementChild;
      const stage = await kit.changeScreen(kit.main, (target) => kit.form(target));
      return { stageIsNew: stage !== before && stage === kit.main.firstElementChild, animations: document.getAnimations().length };
    });
    out[name].errors = errors;
    await page.close();
  }
  // A screen that has nothing to show for a moment: the old screen stays until it has.
  let page = await (await browser.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
  await page.goto(url, { waitUntil: "load" });
  out.late = await watched(page, async (kit) => {
    await kit.changeScreen(kit.main, (target) => setTimeout(() => kit.form(target), 120));
    return {};
  });
  // A screen that never renders must not leave the app looking stuck: the change still happens.
  out.never = await watched(page, async (kit) => {
    await kit.changeScreen(kit.main, () => {});
    return {};
  });
  // Two changes in quick succession: the last one wins and nothing is left half-way.
  await page.goto(url, { waitUntil: "load" });
  out.twice = await watched(page, async (kit) => {
    const first = kit.changeScreen(kit.main, (target) => kit.form(target));
    const second = kit.changeScreen(kit.main, kit.list);
    await Promise.all([first, second]);
    return { name: kit.main.style.viewTransitionName };
  });
  await page.close();
  await browser.close();
  console.log(JSON.stringify(out));
})().catch((error) => { console.error(error); process.exit(1); });
"""


def playwright_available() -> bool:
    if shutil.which("node") is None:
        return False
    return subprocess.run(["node", "-e", "require('playwright')"], capture_output=True).returncode == 0


pytestmark = pytest.mark.skipif(not playwright_available(), reason="node with playwright not available")


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@pytest.fixture(scope="module")
def seen(tmp_path_factory):
    site = tmp_path_factory.mktemp("motion-kit")
    for name in ("index.html", "page.js"):
        shutil.copy(PAGE / name, site / name)
    shutil.copy(KIT, site / "motion-kit.js")
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(site)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        result = subprocess.run(["node", "-e", DRIVER, f"http://127.0.0.1:{server.server_port}/index.html"],
                                capture_output=True, text=True, timeout=180)
    finally:
        server.shutdown()
    assert result.returncode == 0, result.stderr[-2000:]
    return json.loads(result.stdout.strip().splitlines()[-1])


def test_a_change_of_screen_never_shows_an_empty_screen(seen):
    moving = seen["moving"]
    assert moving["errors"] == [] and moving["frames"] > 10
    assert moving["blankFrames"] == 0
    assert moving["heading"] == "New work order" and moving["stageIsNew"] is True and moving["screens"] == 1


def test_what_is_outside_the_screen_stays_and_the_user_lands_in_the_new_one(seen):
    moving = seen["moving"]
    assert moving["barMoved"] is False
    assert moving["focus"] == "H1"  # focus was in the old screen, so it moves to the new one's heading
    assert moving["scrollY"] == 0  # the new screen starts at its top


def test_reduced_motion_changes_at_once_and_still_never_blank(seen):
    reduced = seen["reduced"]
    assert reduced["blankFrames"] == 0 and reduced["heading"] == "New work order" and reduced["took"] < 150


def test_a_slow_screen_keeps_the_old_one_until_it_has_something_to_show(seen):
    assert seen["late"]["blankFrames"] == 0 and seen["late"]["heading"] == "New work order"


def test_a_screen_that_never_renders_does_not_leave_the_app_stuck(seen):
    assert seen["never"]["took"] < 1500 and seen["never"]["heading"] is None


def test_two_quick_changes_end_on_the_last_one(seen):
    assert seen["twice"]["heading"] == "Work orders" and seen["twice"]["screens"] == 1 and seen["twice"]["name"] == ""
