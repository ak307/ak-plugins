"""Prepare blind scoring packs for finished eval runs.

For each run folder it serves the built project, takes desktop and phone
full-page screenshots, films the first load and a few clicks, and copies up to
four flow filmstrips the run made itself. Each pack gets a random label so the
scorer can't tell which scenario run or skills version produced it; the mapping
is written to `labels.json` (for the report, not for the scorer).

Usage:
    python3 evals/score_pack.py <output-folder> <run-folder> [<run-folder> ...]
"""
from __future__ import annotations

import json
import random
import shutil
import string
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from scenarios import SCREENSHOT_SCRIPT, find_index, serve  # noqa: E402

PROBE = SCREENSHOT_SCRIPT.parent / "interaction-probe.cjs"


def project_of(run_folder: Path) -> Path | None:
    """The folder holding the built index.html (skipping QA output and dependencies)."""
    candidates = [path for path in (run_folder / "workspace").rglob("index.html")
                  if not any(part in ("node_modules", "qa-screenshots", "motion-shots", "layout-shots") for part in path.parts)]
    if not candidates:
        return None
    return min(candidates, key=lambda path: len(path.parts)).parent


def make_pack(run_folder: Path, pack: Path) -> None:
    project = project_of(run_folder)
    if project is None:
        (pack / "MISSING.txt").write_text("no index.html built")
        return
    index = find_index(project)
    with serve(project) as base:
        url = f"{base}/{index.relative_to(project).as_posix()}"
        subprocess.run(["node", str(SCREENSHOT_SCRIPT), url, str(pack / "shots"), "--full-page",
                        "--sizes=1440x900,390x844"], capture_output=True, text=True, timeout=300)
        subprocess.run(["node", str(PROBE), url, str(pack / "films"), "--max-clicks=4"],
                       capture_output=True, text=True, timeout=900)
    for leftover in (pack / "films").glob("00-full-page.png"):
        leftover.unlink()
    # The newest flow films show the final design; earlier ones may be from a first iteration.
    own_films = sorted((path for path in (run_folder / "workspace").rglob("[0-9][0-9]-*.png")
                        if path.stem.split("-")[1] in ("click", "press", "hover")),
                       key=lambda path: path.stat().st_mtime, reverse=True)[:4]
    for number, film in enumerate(own_films, 1):
        shutil.copy(film, pack / f"flow-{number}.png")
    for ignore in pack.rglob(".gitignore"):
        ignore.unlink()


def main() -> None:
    output = Path(sys.argv[1])
    runs = [Path(arg) for arg in sys.argv[2:]]
    output.mkdir(parents=True, exist_ok=True)
    labels = {}
    for run in runs:
        label = "build-" + "".join(random.choices(string.ascii_lowercase, k=5))
        labels[label] = run.name
        (output / label).mkdir()
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(lambda item: make_pack(Path(item[1]), output / item[0]),
                      [(label, str(next(run for run in runs if run.name == name))) for label, name in labels.items()]))
    (output / "labels.json").write_text(json.dumps(labels, indent=1))
    print(json.dumps(labels, indent=1))


if __name__ == "__main__":
    main()
