"""Consistency report across eval rounds.

Reads every results.json under evals/results (optionally only runs made with
given skills commits) and the blind scores under evals/scores, and prints per
scenario: runs, check pass rate (mean and weakest), critical failures, blind
score (mean, weakest, spread, standard deviation), acceptance against the
rubric (overall ≥ 8.5, no dimension < 7), and average minutes. Also prints an
originality table: how alike the fonts and main surfaces of different products
are (from each run's audit.json).

Usage:
    python3 evals/report.py [--since YYYYMMDD-HHMMSS] [--scenario NAME ...]
"""
from __future__ import annotations

import argparse
import json
import re
import statistics
from itertools import combinations
from pathlib import Path

HERE = Path(__file__).resolve().parent
CRITICAL = ("scenario ran", "no console or page errors", "no horizontal overflow",
            "no serious/critical accessibility")


def load_results(since: str | None) -> list:
    runs = []
    for path in sorted((HERE / "results").glob("*/results.json")):
        if since and path.parent.name < since:
            continue
        for result in json.loads(path.read_text()):
            # A session cut off by the account's usage limit never ran: leave it out of the statistics.
            if any(re.search(r"hit your .{0,20}limit", str(check.get("detail", "")), re.I) for check in result["checks"]):
                continue
            result["round"] = path.parent.name
            runs.append(result)
    return runs


def load_scores() -> dict:
    """Blind scores by run folder name (from the labels mapping of each scoring pack)."""
    scores = {}
    for path in sorted((HERE / "scores").glob("*.json")):
        for entry in json.loads(path.read_text()):
            scores[entry["run"]] = entry
    return scores


def describe(values: list) -> str:
    if not values:
        return "—"
    spread = max(values) - min(values)
    deviation = statistics.pstdev(values) if len(values) > 1 else 0.0
    return f"mean {statistics.mean(values):.1f} · weakest {min(values):.1f} · range {spread:.1f} · sd {deviation:.2f}"


def accepted(entry: dict) -> bool:
    dims = [value for value in entry["scores"].values() if value is not None]
    return bool(dims) and entry["overall"] >= 8.5 and min(dims) >= 7 and not entry.get("critical_failures")


def rgb(value: str) -> tuple | None:
    numbers = [float(part) for part in value.replace("rgba(", "").replace("rgb(", "").replace(")", "").split(",")[:3]
               if part.strip().replace(".", "").isdigit()]
    return tuple(numbers) if len(numbers) == 3 else None


def colourful(value: str) -> bool:
    """Brand surfaces, not the near-white or near-black paper every product shares."""
    colour = rgb(value)
    return colour is not None and max(colour) - min(colour) >= 25


def colour_distance(first: str, second: str) -> float:
    return sum((a - b) ** 2 for a, b in zip(rgb(first), rgb(second))) ** 0.5


def originality(runs: list) -> list[str]:
    """Pairwise likeness of different scenarios' builds: shared fonts and near-identical main surfaces."""
    builds = {}
    for result in runs:
        audit = next(Path(result["workspace"]).rglob("audit.json"), None)
        if audit and result["scenario"] not in builds:
            system = json.loads(audit.read_text()).get("system", {})
            builds[result["scenario"]] = (set(system.get("fonts", [])),
                                          [colour for colour in system.get("palette", []) if colourful(colour)][:3])
    lines = []
    for (first, (fonts_a, palette_a)), (second, (fonts_b, palette_b)) in combinations(builds.items(), 2):
        shared_fonts = fonts_a & fonts_b
        close = sum(1 for a in palette_a for b in palette_b if colour_distance(a, b) < 20)
        flag = " ⚠ alike" if len(shared_fonts) >= 2 or close >= 2 else ""
        lines.append(f"- {first} vs {second}: shared fonts {sorted(shared_fonts) or 'none'} · near-identical surfaces {close}{flag}")
    return lines


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--since")
    parser.add_argument("--scenario", nargs="*")
    args = parser.parse_args()
    runs = [r for r in load_results(args.since) if not args.scenario or r["scenario"] in args.scenario]
    scores = load_scores()
    print("| Scenario | Runs | Checks passed | Critical failures | Blind score | Accepted | Minutes |")
    print("|---|---|---|---|---|---|---|")
    for scenario in sorted({r["scenario"] for r in runs}):
        group = [r for r in runs if r["scenario"] == scenario]
        rates = [100 * sum(c["passed"] for c in r["checks"]) / max(1, len(r["checks"])) for r in group]
        critical = sum(1 for r in group if any(not c["passed"] and c["check"].startswith(CRITICAL) for c in r["checks"]))
        scored = [scores[Path(r["workspace"]).name] for r in group if Path(r["workspace"]).name in scores]
        overall = [entry["overall"] for entry in scored]
        accepted_count = sum(accepted(entry) for entry in scored)
        minutes = [r["minutes"] for r in group if r.get("minutes")]
        minutes_text = f"{statistics.mean(minutes):.0f}" if minutes else "—"
        print(f"| {scenario} | {len(group)} | mean {statistics.mean(rates):.0f}% · weakest {min(rates):.0f}% | "
              f"{critical}/{len(group)} | {describe(overall)} | {accepted_count}/{len(scored) or '—'} | {minutes_text} |")
    print("\nOriginality (different products should not share a look):")
    print("\n".join(originality(runs)) or "- not enough audited builds yet")


if __name__ == "__main__":
    main()
