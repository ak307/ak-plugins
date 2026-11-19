# ruff: noqa: E501 — prompts, fixture code and grading patterns are kept on one line each
"""Grades the sessions in an output folder: hidden tests, existing tests, lint, size of change, cost.

Usage: python3 grade.py <out dir> [<out dir> …]   (prints one line per run and a summary per folder)
"""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent


# What a good final report also says about the existing code it passed through.
RELATED = {
    "F-overtime-summary": r"(?i)(overnight|midnight|negative).{0,200}(hours_between|shift_hours)|(hours_between|shift_hours).{0,200}(overnight|midnight|negative)",
    "G-site-filter": r"(?i)(N\+1|one query per|per[- ]row|each row|site_name\(\).{0,80}(query|loop)|in python|filter(s|ing)? in python|loads? (all|every))",
    "K-settings-update": r"(?i)(cache|lru_cache)",
}
EXISTING_TARGETS = {"F-overtime-summary": set(), "G-site-filter": set()}


def run(command, cwd, timeout=300):
    return subprocess.run(command, cwd=cwd, capture_output=True, text=True, timeout=timeout)


def unittest_counts(output: str) -> tuple[int, int]:
    ran = re.search(r"Ran (\d+) test", output)
    total = int(ran.group(1)) if ran else 0
    failed = re.search(r"FAILED \((.*)\)", output)
    bad = sum(int(n) for n in re.findall(r"(?:failures|errors)=(\d+)", failed.group(1))) if failed else 0
    return total - bad, total


def grade(folder: Path) -> dict:
    case_id = folder.name.rsplit("-", 1)[0]
    workspace = Path((folder / "workspace.txt").read_text().strip())
    events = [json.loads(line) for line in (folder / "stream.jsonl").read_text().splitlines() if line.startswith("{")]
    result = next((e for e in events if e.get("type") == "result"), {})
    skills = [b["input"].get("skill", "").split(":")[-1] for e in events if e.get("type") == "assistant"
              for b in e["message"]["content"] if b.get("type") == "tool_use" and b["name"] == "Skill"]
    agents = sum(1 for e in events if e.get("type") == "assistant" for b in e["message"]["content"]
                 if b.get("type") == "tool_use" and b["name"] in ("Agent", "Task"))
    # Hidden tests run on a copy, so grading never changes the workspace.
    copy = folder / "graded"
    if copy.exists():
        shutil.rmtree(copy)
    shutil.copytree(workspace, copy, ignore=shutil.ignore_patterns(".git", "__pycache__"))
    shutil.copy(HERE / "hidden" / f"{case_id}.py", copy / "tests" / "test_hidden_grading.py")
    hidden = run([sys.executable, "-m", "unittest", "tests.test_hidden_grading", "-v"], copy)
    hidden_passed, hidden_total = unittest_counts(hidden.stderr)
    (copy / "tests" / "test_hidden_grading.py").unlink()
    existing = run([sys.executable, "-m", "unittest", "discover", "-s", "tests", "-t", "."], copy)
    existing_passed, existing_total = unittest_counts(existing.stderr)
    changed = [line[3:] for line in run(["git", "status", "--porcelain"], workspace).stdout.splitlines()]
    python_changed = [path for path in changed if path.endswith(".py") and not path.startswith("tests/")]
    lint = run(["uvx", "-q", "ruff", "check", "--select", "E,F,B,SIM,C90", "--output-format", "concise", *python_changed], workspace) if python_changed else None
    lint_findings = len([line for line in lint.stdout.splitlines() if re.match(r".+:\d+:\d+:", line)]) if lint else 0
    diff = run(["git", "diff", "--numstat"], workspace).stdout
    added = sum(int(parts[0]) for parts in (line.split("\t") for line in diff.splitlines()) if parts[0].isdigit())
    untracked = run(["git", "ls-files", "--others", "--exclude-standard"], workspace).stdout.split()
    added += sum(len((workspace / path).read_text(errors="ignore").splitlines()) for path in untracked if (workspace / path).is_file())
    final = result.get("result") or ""
    usage = result.get("usage") or {}
    hidden_ok = hidden_passed == hidden_total and hidden_total > 0
    final_text = result.get("result") or ""
    # G: leaving the old per-row lookup alone is right when it is proposed (AK approves changes beyond the task).
    proposed_instead = case_id == "G-site-filter" and not hidden_ok and hidden_passed == hidden_total - 1 and \
        bool(re.search(r"🟢", final_text)) and bool(re.search(RELATED["G-site-filter"], final_text))
    return {
        "run": folder.name, "hidden": f"{hidden_passed}/{hidden_total}", "hidden_ok": hidden_ok or proposed_instead,
        "proposed_instead_of_fixing": proposed_instead,
        "existing": f"{existing_passed}/{existing_total}", "lint": lint_findings, "lines_added": added,
        "new_test_files": len([p for p in changed if p.startswith("tests/")]),
        "skills": skills, "agents": agents, "turns": result.get("num_turns"), "cost": round(result.get("total_cost_usd", 0), 2),
        "minutes": round(result.get("duration_ms", 0) / 60000, 1), "output_tokens": usage.get("output_tokens"),
        "tests_in_report": bool(re.search(r"(?im)^\W*tests?\b", final)),
        "mentions_end_before_start": bool(re.search(r"(?i)(end\w*\s+(is\s+)?(before|earlier|<=?)|ends?_at\s*<=?\s*starts?_at|zero[- ]length|negative|end.{0,30}after.{0,20}start)", final)) if case_id.startswith("C-") else None,
        "reports_related": bool(re.search(RELATED[case_id], final)) if case_id in RELATED else None,
        "existing_code_touched": sorted(set(changed) & EXISTING_TARGETS.get(case_id, set())),
    }


for out in sys.argv[1:]:
    rows = [grade(folder) for folder in sorted(Path(out).iterdir()) if (folder / "stream.jsonl").exists()]
    for row in rows:
        print(json.dumps(row))
    ok = sum(row["hidden_ok"] for row in rows)
    print(f"== {out}: hidden tests all pass in {ok}/{len(rows)} runs · lint findings {sum(r['lint'] for r in rows)} · "
          f"cost ${sum(r['cost'] for r in rows):.2f} · minutes {sum(r['minutes'] for r in rows):.1f} · "
          f"output tokens {sum(r['output_tokens'] or 0 for r in rows)}")
    (Path(out) / "grades.json").write_text(json.dumps(rows, indent=1))
