"""Serve built eval projects on local ports so an experience tester can use them.

Each run folder's project (the folder holding its index.html) is served on
its own port from 48100 up; the label → URL map is written to urls.json in
the output folder. Labels come from a score pack's labels.json, so the
tester stays blind to which scenario or skills version it is using.
Runs until stopped.

Usage:
    python3 evals/serve_projects.py <score-pack-folder>
"""
from __future__ import annotations

import functools
import http.server
import json
import sys
import threading
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from score_pack import project_of  # noqa: E402
from scenarios import find_index  # noqa: E402

FIRST_PORT = 48100


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args) -> None:
        pass


def serve(folder: Path, port: int) -> None:
    handler = functools.partial(QuietHandler, directory=str(folder))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()


def main() -> None:
    pack = Path(sys.argv[1])
    labels = json.loads((pack / "labels.json").read_text())
    runs_root = Path("/tmp")
    urls = {}
    for number, (label, run_name) in enumerate(sorted(labels.items())):
        project = project_of(runs_root / run_name)
        if project is None:
            continue
        port = FIRST_PORT + number
        serve(project, port)
        urls[label] = f"http://127.0.0.1:{port}/{find_index(project).relative_to(project).as_posix()}"
    (pack / "urls.json").write_text(json.dumps(urls, indent=1))
    print(json.dumps(urls, indent=1), flush=True)
    threading.Event().wait()


if __name__ == "__main__":
    main()
