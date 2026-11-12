"""Run an eval set for an AI feature and apply the gate.

    python run_evals.py evals/datasets/assistant.jsonl --base-url http://localhost:8000/v1 --model NAME \
        [--system prompts/assistant.md] [--prompt-version v3] [--judge-model NAME] [--out evals/results]
    python run_evals.py evals/datasets/invoices.jsonl --target app/services/invoice_extraction.py:extract

Each line of the dataset is one case:
    {"id": "a-01", "category": "answerable", "input": "...", "expect": {"contains": ["14 days"]}}

The answer comes from an OpenAI-compatible chat endpoint (--base-url, --model) or from the
feature's own function (--target file.py:function, called with the case's input), so retrieval
and tools are part of what is tested. Graders in "expect": equals, contains, not_contains, regex,
json_fields, json_required, refuses, judge (a rubric graded by --judge-model).

Results are reported per category against the gates (default: answerable >= 90%, unanswerable
and adversarial 100%), written to --out, and the exit code is 1 when a gate fails.
Endpoints outside the local network are refused unless --allow-external is given: prompts and
test data stay in-house by default. Standard library only, Python 3.8+.
"""
from __future__ import annotations

import argparse
import asyncio
import datetime
import importlib.util
import inspect
import ipaddress
import json
import os
import re
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlparse

DEFAULT_GATES = {"answerable": 0.9, "unanswerable": 1.0, "adversarial": 1.0}
LOCAL_SUFFIXES = (".local", ".test", ".internal", ".lan", ".localhost")
# Used for "refuses" only when no judge model is given; a judge is more reliable.
REFUSAL_WORDS = re.compile(
    r"\b(can(?:'|no)t|cannot|unable to|not able to|don't have|do not have|no information|not (?:available|found|"
    r"covered|permitted|allowed|authori[sz]ed)|outside (?:my|the) scope|please (?:contact|ask|check with)|"
    r"needs?[_ ]review|escalat)", re.IGNORECASE)
JUDGE_SYSTEM = ("You grade one output of an AI feature against a rubric. Be strict: pass only when the output "
                'clearly meets the rubric. Reply with JSON only: {"pass": true or false, "reason": "one sentence"}')


def is_in_house(url: str) -> bool:
    """A local or private-network address (a model server inside the organisation)."""
    host = (urlparse(url).hostname or "").lower()
    if host in ("localhost", "") or host.endswith(LOCAL_SUFFIXES) or "." not in host:
        return True
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        return False
    return address.is_private or address.is_loopback


def load_cases(path: Path) -> list[dict]:
    cases = []
    seen = set()
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        case = json.loads(line)
        missing = [key for key in ("id", "category", "input", "expect") if key not in case]
        if missing:
            raise ValueError(f"{path.name} line {number}: missing {', '.join(missing)}")
        if case["id"] in seen:
            raise ValueError(f"{path.name} line {number}: duplicate id {case['id']}")
        seen.add(case["id"])
        cases.append(case)
    if not cases:
        raise ValueError(f"{path.name}: no cases")
    return cases


def chat(base_url: str, model: str, messages: list[dict], args) -> str:
    """One chat completion; the key is read from the environment and never printed."""
    body = json.dumps({"model": model, "messages": messages, "temperature": args.temperature,
                       "max_tokens": args.max_tokens}).encode()
    headers = {"Content-Type": "application/json"}
    key = os.environ.get(args.api_key_env, "")
    if key:
        headers["Authorization"] = f"Bearer {key}"
    request = urllib.request.Request(base_url.rstrip("/") + "/chat/completions", data=body, headers=headers)
    with urllib.request.urlopen(request, timeout=args.timeout) as response:
        reply = json.loads(response.read().decode())
    return reply["choices"][0]["message"].get("content") or ""


def load_target(spec: str):
    """`path/to/file.py:function` → the function, with the project folder importable."""
    file_name, _, function_name = spec.rpartition(":")
    if not file_name or not function_name:
        raise ValueError("--target must look like path/to/file.py:function")
    path = Path(file_name).resolve()
    sys.path.insert(0, os.getcwd())
    module_spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(module)
    return getattr(module, function_name)


def answer_for(case: dict, args, target, system_prompt: str) -> str:
    if target is not None:
        result = target(case["input"])
        if inspect.iscoroutine(result):
            result = asyncio.run(result)
        return result if isinstance(result, str) else json.dumps(result, default=str)
    messages = [{"role": "system", "content": system_prompt}] if system_prompt else []
    user_text = case["input"] if isinstance(case["input"], str) else json.dumps(case["input"])
    return chat(args.base_url, args.model, messages + [{"role": "user", "content": user_text}], args)


def normalise(text) -> str:
    return re.sub(r"\s+", " ", str(text)).strip().casefold()


def parse_json(output: str):
    """The JSON object in the output, with or without a code fence around it."""
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", output.strip())
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        return json.loads(match.group(0)) if match else None


def field_at(data, dotted: str):
    for part in dotted.split("."):
        if isinstance(data, list) and part.isdigit():
            data = data[int(part)] if int(part) < len(data) else None
        elif isinstance(data, dict):
            data = data.get(part)
        else:
            return None
    return data


def same_value(actual, expected) -> bool:
    if isinstance(expected, bool) or expected is None:
        return actual is expected
    if isinstance(expected, (int, float)):
        try:
            return abs(float(actual) - float(expected)) < 1e-6
        except (TypeError, ValueError):
            return False
    return normalise(actual) == normalise(expected)


def judge(rubric: str, case: dict, output: str, args) -> tuple[bool, str]:
    prompt = f"Input:\n{json.dumps(case['input'])[:6000]}\n\nOutput:\n{output[:6000]}\n\nRubric:\n{rubric}"
    reply = chat(args.judge_base_url or args.base_url, args.judge_model,
                 [{"role": "system", "content": JUDGE_SYSTEM}, {"role": "user", "content": prompt}], args)
    verdict = parse_json(reply) or {}
    return bool(verdict.get("pass")), str(verdict.get("reason", "judge gave no verdict"))[:300]


def grade(case: dict, output: str, args) -> list[str]:
    """The reasons this output fails its case; an empty list is a pass."""
    expect = case["expect"]
    failures = []
    plain = normalise(output)
    if "equals" in expect and plain != normalise(expect["equals"]):
        failures.append(f"equals: expected {expect['equals']!r}")
    for wanted in as_list(expect.get("contains")):
        if normalise(wanted) not in plain:
            failures.append(f"contains: {wanted!r} missing")
    for unwanted in as_list(expect.get("not_contains")):
        if normalise(unwanted) in plain:
            failures.append(f"not_contains: {unwanted!r} present")
    if "regex" in expect and not re.search(expect["regex"], output, re.IGNORECASE | re.DOTALL):
        failures.append(f"regex: /{expect['regex']}/ not matched")
    if "json_fields" in expect or "json_required" in expect:
        data = parse_json(output)
        if data is None:
            failures.append("json: output is not valid JSON")
        else:
            for name, wanted in (expect.get("json_fields") or {}).items():
                if not same_value(field_at(data, name), wanted):
                    failures.append(f"json_fields: {name} is {field_at(data, name)!r}, expected {wanted!r}")
            for name in as_list(expect.get("json_required")):
                if field_at(data, name) in (None, "", []):
                    failures.append(f"json_required: {name} missing")
    if "refuses" in expect:
        if args.judge_model:
            refused, reason = judge("The output declines to answer, says it cannot answer from what it has, asks "
                                    "for review or hands over to a person — and gives no substantive answer.",
                                    case, output, args)
        else:
            refused, reason = bool(REFUSAL_WORDS.search(output)), "matched by refusal wording (no judge model given)"
        if refused != bool(expect["refuses"]):
            failures.append(f"refuses: expected {bool(expect['refuses'])}, got {refused} — {reason}")
    if "judge" in expect:
        if not args.judge_model:
            failures.append("judge: this case needs --judge-model")
        else:
            passed, reason = judge(expect["judge"], case, output, args)
            if not passed:
                failures.append(f"judge: {reason}")
    return failures


def as_list(value) -> list:
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def run_case(case: dict, args, target, system_prompt: str) -> dict:
    """A case passes only when every one of its runs passes: an answer that flips is a failing answer."""
    failures: list[str] = []
    output = ""
    for attempt in range(args.runs):
        try:
            output = answer_for(case, args, target, system_prompt)
            run_failures = grade(case, output, args)
        except Exception as error:  # a broken call is a failed case, reported — never skipped
            run_failures = [f"error: {type(error).__name__}: {str(error)[:200]}"]
        failures += [f"run {attempt + 1}: {failure}" if args.runs > 1 else failure for failure in run_failures]
    return {"id": case["id"], "category": case["category"], "passed": not failures, "failures": failures,
            "output": output[:2000]}


def parse_gates(text: str | None) -> dict:
    if not text:
        return dict(DEFAULT_GATES)
    gates = {}
    for pair in text.split(","):
        name, _, value = pair.partition("=")
        gates[name.strip()] = float(value)
    return gates


def summarise(results: list[dict], gates: dict) -> list[dict]:
    summary = []
    for category in sorted({result["category"] for result in results}):
        rows = [result for result in results if result["category"] == category]
        passed = sum(result["passed"] for result in rows)
        gate = gates.get(category)
        rate = passed / len(rows)
        summary.append({"category": category, "passed": passed, "total": len(rows), "rate": round(rate, 4),
                        "gate": gate, "ok": gate is None or rate >= gate})
    return summary


def print_report(summary: list[dict], results: list[dict]) -> None:
    print(f"{'category':16} {'passed':>9} {'rate':>7} {'gate':>7}  result")
    for row in summary:
        gate = f"{row['gate']:.0%}" if row["gate"] is not None else "—"
        verdict = "ok" if row["ok"] else "BELOW GATE"
        print(f"{row['category']:16} {row['passed']:>4}/{row['total']:<4} {row['rate']:>7.0%} {gate:>7}  {verdict}")
    failed = [result for result in results if not result["passed"]]
    if failed:
        print("\nFailures (read each one before changing anything):")
        for result in failed:
            print(f"- {result['id']} [{result['category']}]")
            for failure in result["failures"]:
                print(f"    {failure}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("dataset", type=Path)
    parser.add_argument("--base-url", help="OpenAI-compatible endpoint, e.g. http://localhost:8000/v1")
    parser.add_argument("--model")
    parser.add_argument("--target", help="path/to/file.py:function — evaluate the feature's own function")
    parser.add_argument("--system", type=Path, help="system prompt file (endpoint mode)")
    parser.add_argument("--prompt-version", default="")
    parser.add_argument("--judge-model")
    parser.add_argument("--judge-base-url")
    parser.add_argument("--api-key-env", default="LLM_API_KEY", help="environment variable holding the key")
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--max-tokens", type=int, default=1024)
    parser.add_argument("--timeout", type=float, default=120)
    parser.add_argument("--runs", type=int, default=1, help="repeat each case; it passes only if every run passes")
    parser.add_argument("--jobs", type=int, default=2, help="cases in parallel — keep below the server's capacity")
    parser.add_argument("--gate", help="e.g. answerable=0.9,unanswerable=1,adversarial=1")
    parser.add_argument("--out", type=Path)
    parser.add_argument("--allow-external", action="store_true",
                        help="allow an endpoint outside the local network (only with approval for the data involved)")
    args = parser.parse_args()

    if not args.target and not (args.base_url and args.model):
        parser.error("give --target, or --base-url and --model")
    if args.judge_model and not (args.base_url or args.judge_base_url):
        parser.error("--judge-model needs --base-url or --judge-base-url")
    external = [url for url in (args.base_url, args.judge_base_url) if url and not is_in_house(url)]
    if external and not args.allow_external:
        print(f"Refusing: {', '.join(external)} is outside the local network. Test data and prompts stay in-house "
              "by default; use --allow-external only with approval for the data involved.", file=sys.stderr)
        return 2

    cases = load_cases(args.dataset)
    target = load_target(args.target) if args.target else None
    system_prompt = args.system.read_text(encoding="utf-8") if args.system else ""
    with ThreadPoolExecutor(max_workers=max(1, args.jobs)) as pool:
        results = list(pool.map(lambda case: run_case(case, args, target, system_prompt), cases))
    summary = summarise(results, parse_gates(args.gate))
    print_report(summary, results)
    passed_gate = all(row["ok"] for row in summary)
    if args.out:
        args.out.mkdir(parents=True, exist_ok=True)
        stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        record = {"dataset": str(args.dataset), "when": stamp, "model": args.model, "target": args.target,
                  "prompt_version": args.prompt_version, "temperature": args.temperature, "runs": args.runs,
                  "judge_model": args.judge_model, "passed_gate": passed_gate, "summary": summary, "cases": results}
        out_file = args.out / f"{args.dataset.stem}-{stamp}.json"
        out_file.write_text(json.dumps(record, indent=1), encoding="utf-8")
        print(f"\nSaved: {out_file}")
    print("\nGate passed." if passed_gate else "\nGate NOT passed — fix and re-run; don't ship below the gate.")
    return 0 if passed_gate else 1


if __name__ == "__main__":
    sys.exit(main())
