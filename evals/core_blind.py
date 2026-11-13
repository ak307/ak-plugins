"""Prepare a finished brief of the core test for blind judging.

    uv run -q --no-project --with pyyaml python evals/core_blind.py <setup>=<results> <setup>=<results> <brief id> <blind root> <key file>

e.g. current=evals/results/round-1 surface=evals/results/round-3. Copies the two builds of a brief
(each from its own setup and results folder) to <blind root>/<brief>/A/app and
.../B/app in a random order, with everything that would give away which setup made it removed
(design notes, QA records, reports, tests). The order is written only to <key file>, which stays
outside the blind folder, so judges — people or agents — see two unlabelled apps.
"""
from __future__ import annotations

import json
import random
import shutil
import subprocess
import sys
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
GIVEAWAYS = ("DESIGN.md", "ARCHITECTURE.md", "SECURITY.md", "README.md", "CLAUDE.md", "qa-screenshots", "tests", "test",
             "e2e", "docs", ".git", ".gitignore", "playwright-report", "test-results")


def served_copy(workspace: Path, brief: dict, destination: Path) -> None:
    """The app as a browser needs it: the built output for a built app, the files themselves otherwise."""
    for command in brief.get("build", []):
        subprocess.run(command, shell=True, cwd=workspace, capture_output=True, timeout=900)
    source = workspace / brief.get("serve", "")
    if destination.exists():
        shutil.rmtree(destination)
    shutil.copytree(source, destination, ignore=shutil.ignore_patterns("node_modules", *GIVEAWAYS))


def main() -> int:
    # setup name → results folder: the two setups may come from different rounds
    results = {name: Path(folder) for name, folder in (pair.split("=", 1) for pair in sys.argv[1:3])}
    brief_id, blind_root, key_file = sys.argv[3], Path(sys.argv[4]), Path(sys.argv[5])
    briefs = {brief["id"]: brief for brief in yaml.safe_load((HERE / "core-briefs.yaml").read_text())["briefs"]}
    brief = briefs[brief_id]
    setups = list(results)
    random.shuffle(setups)
    key = json.loads(key_file.read_text()) if key_file.exists() else {}
    key[brief_id] = {"A": setups[0], "B": setups[1]}
    for letter, setup in zip("AB", setups):
        meta = json.loads((results[setup] / f"{brief_id}-{setup}" / "meta.json").read_text())
        served_copy(Path(meta["workspace"]), brief, blind_root / brief_id / letter / "app")
    (blind_root / brief_id / "brief.txt").write_text(brief["prompt"] + "\n")
    key_file.write_text(json.dumps(key, indent=1))
    print(f"{brief_id}: A and B ready under {blind_root / brief_id}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
