"""The scroll edge: scrollEdge() in experience-kit.js with the glass kit's .lg-scroll-edge and .lg-cap.

Whatever stays at the top while the page scrolls is plain page at rest and frosted once content is
under it; focus and jump targets land below it; one compact bar takes over the title's context.
"""
import json
import shutil
import subprocess
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "plugins/arkar-dev-standards/skills"
KIT = SKILLS / "arkar-ui-intelligence/assets/experience-kit.js"
GLASS = SKILLS / "arkar-ui-design-system/assets/liquid-glass.css"
AUDIT = SKILLS / "arkar-ui-visual-qa/scripts/audit.cjs"
PAGES = Path(__file__).parent / "fixtures" / "scroll-edge"

DRIVER = r"""
const { chromium } = require("playwright");
(async () => {
  const [port] = process.argv.slice(1);
  const browser = await chromium.launch();
  const out = {};

  const state = (page) => page.evaluate(() => {
    const bar = document.getElementById("bar");
    const slot = bar.querySelector("[data-context-title]");
    return { over: bar.hasAttribute("data-over"), context: bar.hasAttribute("data-context"),
      slot: slot.textContent, slotHidden: slot.getAttribute("aria-hidden"),
      frost: Number(getComputedStyle(bar, "::before").opacity), fade: Number(getComputedStyle(bar, "::after").opacity),
      padding: getComputedStyle(window.scroller).scrollPaddingTop, pinned: window.scroller.style.getPropertyValue("--pinned-top"),
      height: Math.round(bar.getBoundingClientRect().height) };
  });
  const scrollTo = async (page, y) => {
    await page.evaluate((to) => window.scroller.scrollTo(0, to), y);
    await page.waitForTimeout(450);
  };
  // A link sits 10 px from the top of the scroller, under the bar; Shift+Tab moves focus onto it.
  const focusUnderTheBar = async (page) => {
    await page.evaluate(async () => {
      const links = [...document.querySelectorAll("main a")];
      window.scroller.scrollTo(0, 0);
      window.scroller.scrollBy(0, links[5].getBoundingClientRect().top - 10);
      await new Promise((resolve) => setTimeout(resolve, 150));
      links[6].focus({ preventScroll: true });
    });
    await page.keyboard.press("Shift+Tab");
    await page.waitForTimeout(350);
    return page.evaluate(() => ({ focused: document.activeElement.getAttribute("href"),
      clear: Math.round(document.activeElement.getBoundingClientRect().top - document.getElementById("bar").getBoundingClientRect().bottom) }));
  };

  for (const [name, path] of [["attached", "attached.html"], ["floating", "floating.html"], ["inner", "attached.html?inner=1"]]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto(`http://127.0.0.1:${port}/${path}`);
    await page.waitForTimeout(300);
    const found = { rest: await state(page) };
    await scrollTo(page, 30); // content is under the bar, the title is still in view
    found.justOver = await state(page);
    await scrollTo(page, 700);
    found.scrolled = await state(page);
    await page.evaluate(() => { location.hash = "#section-6"; });
    await page.waitForTimeout(350);
    found.jump = await page.evaluate(() => Math.round(
      document.getElementById("section-6").getBoundingClientRect().top - document.getElementById("bar").getBoundingClientRect().bottom));
    found.focus = await focusUnderTheBar(page);
    await scrollTo(page, 0);
    found.back = await state(page);
    if (name === "attached") {
      // Stopped: the bar no longer follows the page — and without the kit the same key press hides the focus.
      await scrollTo(page, 700);
      await page.evaluate(() => { window.stopEdge(); document.documentElement.style.scrollPaddingTop = ""; });
      await scrollTo(page, 0);
      found.stopped = await state(page);
      found.focusWithoutKit = await focusUnderTheBar(page);
    }
    found.errors = errors;
    out[name] = found;
    await page.close();
  }

  // Reduced motion: the two states switch at once.
  const calm = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  await calm.goto(`http://127.0.0.1:${port}/attached.html`);
  out.reducedMotion = await calm.evaluate(() => [getComputedStyle(document.getElementById("bar"), "::before").transitionDuration,
    getComputedStyle(document.querySelector(".lg-control")).transitionDuration]);
  await calm.close();
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
def site(tmp_path_factory):
    """The test pages beside the two kits, served locally, as a project that copied them would have them."""
    folder = tmp_path_factory.mktemp("scroll-edge")
    for source in [*PAGES.iterdir(), KIT, GLASS]:
        shutil.copy(source, folder / source.name)
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(folder)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield server.server_port
    server.shutdown()


@pytest.fixture(scope="module")
def walked(site):
    result = subprocess.run(["node", "-e", DRIVER, str(site)], capture_output=True, text=True, timeout=180)
    assert result.returncode == 0, result.stderr[-2000:]
    return json.loads(result.stdout.strip().splitlines()[-1])


@pytest.mark.parametrize("page", ["attached", "floating", "inner"])
def test_the_bar_is_plain_page_at_rest_and_changes_once_content_is_under_it(walked, page):
    found = walked[page]
    assert found["errors"] == []
    assert found["rest"]["over"] is False and found["rest"]["context"] is False
    assert found["justOver"]["over"] is True and found["justOver"]["context"] is False  # the title is still on screen
    assert found["scrolled"]["over"] is True
    assert found["back"]["over"] is False and found["back"]["context"] is False
    # The material of each state: the attached header frosts; the floating bar's cap fades content out below it.
    layer = "fade" if page == "floating" else "frost"
    assert found["rest"][layer] == 0 and found["scrolled"][layer] == 1


@pytest.mark.parametrize("page", ["attached", "floating", "inner"])
def test_one_bar_takes_over_the_title_when_the_title_scrolls_out(walked, page):
    scrolled = walked[page]["scrolled"]
    assert scrolled["context"] is True
    assert scrolled["slot"] == "Hot work on level 14, Harbour Tower"
    assert scrolled["slotHidden"] == "true"  # the heading itself is still in the page for screen readers
    assert scrolled["height"] == walked[page]["rest"]["height"] <= 64  # the same single band, inside the budget


@pytest.mark.parametrize("page", ["attached", "floating", "inner"])
def test_focus_and_jump_targets_land_below_the_bar(walked, page):
    found = walked[page]
    assert found["rest"]["pinned"] == f"{found['rest']['height']}px"
    assert found["rest"]["padding"] == f"{found['rest']['height'] + 12}px"
    assert found["jump"] >= 0  # a heading reached by its link is not under the bar
    assert found["focus"]["focused"] == "#section-7" and found["focus"]["clear"] >= 0


def test_stopping_it_leaves_the_bar_alone_and_without_it_the_same_key_press_hides_the_focus(walked):
    found = walked["attached"]
    assert found["stopped"]["over"] is True  # scrolled back to the top, and nothing updated it
    assert found["focusWithoutKit"]["focused"] == "#section-7" and found["focusWithoutKit"]["clear"] < 0


def test_reduced_motion_switches_the_material_at_once(walked):
    assert walked["reducedMotion"] == ["0s", "0s"]


@pytest.mark.parametrize(("page", "scheme"), [("attached.html", "light"), ("floating.html", "dark")])
def test_the_audit_finds_nothing_wrong_with_the_scrolled_header_in_either_theme(site, page, scheme):
    result = subprocess.run(["node", str(AUDIT), f"http://127.0.0.1:{site}/{page}", f"--scheme={scheme}", "--json"],
                            capture_output=True, text=True, timeout=240)
    assert result.returncode == 0, result.stderr[-1500:]
    report = json.loads(result.stdout.strip().splitlines()[-1])
    header = report["header"]
    for size in ("desktop", "phone"):
        seen = header[size]
        assert len(seen["top"]["bands"]) == 1 and seen["top"]["height"] <= 64
        assert seen["around"] <= 0.01 and seen["through"] <= 0.01  # nothing above or beside the bar, nothing readable through it
        assert seen["tint"] >= 0.7
        # The bar is in the page's own tone: light on the light page, dark on the dark one.
        assert (seen["pageLight"] > 0.65) is (scheme == "light") and abs(seen["barLight"] - seen["pageLight"]) < 0.3
    assert header["phone"]["share"] <= 0.15
    assert header["focus"]["hidden"] == []
    assert header["safeAreas"] == {"cover": True, "insets": True}
    for size in report["sizes"]:
        assert size["consoleErrors"] == [] and size["overflow"] is False and size["axe"] == []
