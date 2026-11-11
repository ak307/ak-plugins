"""experience-kit.js: test switches only on local hosts; sensitive drafts don't outlive the tab; sign-out clears storage."""
import json
import shutil
import subprocess
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / "plugins/arkar-dev-standards/skills/arkar-ui-intelligence/assets/experience-kit.js"
PAGE = Path(__file__).parent / "fixtures" / "kit-page" / "index.html"

DRIVER = r"""
const { chromium } = require("playwright");
(async () => {
  const [port] = process.argv.slice(1);
  // app.example resolves to this machine, so the same page can be opened on a non-local host name.
  const browser = await chromium.launch({ args: ["--host-resolver-rules=MAP app.example 127.0.0.1"] });
  const out = {};
  for (const host of ["127.0.0.1", "app.example"]) {
    const page = await browser.newPage();
    await page.goto(`http://${host}:${port}/index.html?fail=always&latency=fast`);
    out[host] = await page.evaluate(() => window.kitResult);
    if (host === "127.0.0.1") {
      await page.fill("#note", "S1234567D visitor");
      await page.fill("#plain", "bring the ladder");
      out.storage = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
      await page.evaluate(() => window.clearAppStorage());
      out.afterSignOut = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
    }
    await page.close();
  }
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


def test_kit_is_safe_by_default(tmp_path):
    shutil.copy(PAGE, tmp_path / "index.html")
    shutil.copy(KIT, tmp_path / "experience-kit.js")
    server = ThreadingHTTPServer(("0.0.0.0", 0), partial(QuietHandler, directory=str(tmp_path)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        result = subprocess.run(["node", "-e", DRIVER, str(server.server_port)], capture_output=True, text=True,
                                timeout=120, cwd=tmp_path)
    finally:
        server.shutdown()
    assert result.returncode == 0, result.stderr
    out = json.loads(result.stdout.strip().splitlines()[-1])
    assert out["127.0.0.1"]["failed"] is True          # ?fail works locally, so recovery can be tested
    assert out["app.example"]["failed"] is False       # and is ignored on a deployed host
    assert "draft:visitor" in out["storage"]["session"] and "draft:visitor" not in out["storage"]["local"]
    assert out["storage"]["local"].get("draft:comment") == "bring the ladder"
    assert not any(key.startswith("draft:") for key in out["afterSignOut"]["local"] | out["afterSignOut"]["session"])
