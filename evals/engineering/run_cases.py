"""Run cases.json as real headless sessions with the plugins of a given folder (the branch's `plugins/`).

Usage: python3 run_cases.py <plugins folder> <out dir> <model> <case id>[:<run name>] …
Each session gets its own new git repository holding only the case's files. Up to four run at once.
"""
import json
import os
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
plugins, out, model = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
cases = {case["id"]: case for case in json.loads((HERE / "cases.json").read_text())}
wanted = [(item.split(":")[0], item.split(":")[-1] if ":" in item else "1") for item in sys.argv[4:]]
plugin_args = [part for plugin in sorted(plugins.iterdir()) if (plugin / ".claude-plugin" / "plugin.json").exists()
               for part in ("--plugin-dir", str(plugin))]


def git(workspace: Path, *arguments: str) -> None:
    subprocess.run(["git", "-c", "user.name=fixture", "-c", "user.email=fixture@example.com", *arguments], cwd=workspace,
                   check=True, capture_output=True)


def run(item: tuple[str, str]) -> dict:
    case_id, run_name = item
    case = cases[case_id]
    workspace = Path(tempfile.mkdtemp(prefix=f"arkar-gate-{case_id}-{run_name}-"))
    for name, content in case["files"].items():
        path = workspace / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    git(workspace, "init", "-q")
    git(workspace, "add", "-A")
    git(workspace, "commit", "-qm", "start")
    command = ["claude", "-p", case["prompt"], "--output-format", "stream-json", "--verbose", "--model", model,
               "--dangerously-skip-permissions", "--max-turns", str(case["max_turns"]), *plugin_args]
    started = time.time()
    process = subprocess.run(command, cwd=workspace, env={**os.environ, "IS_SANDBOX": "1"}, stdin=subprocess.DEVNULL,
                             capture_output=True, text=True, timeout=5400)
    folder = out / f"{case_id}-{run_name}"
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "stream.jsonl").write_text(process.stdout, encoding="utf-8")
    (folder / "stderr.txt").write_text(process.stderr[-4000:], encoding="utf-8")
    (folder / "workspace.txt").write_text(str(workspace), encoding="utf-8")
    return {"id": f"{case_id}-{run_name}", "minutes": round((time.time() - started) / 60, 1), "exit": process.returncode}


with ThreadPoolExecutor(max_workers=4) as pool:
    for done in pool.map(run, wanted):
        print(json.dumps(done), flush=True)
