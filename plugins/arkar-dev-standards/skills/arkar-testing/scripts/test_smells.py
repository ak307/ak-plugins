"""List tests that probably can't be trusted — candidates to read, not verdicts.

    python test_smells.py tests/                 # a folder or several
    python test_smells.py tests/ --json

Looks through test files (Python, PHP, JavaScript/TypeScript, Dart) for:
  no-assertion     a test with nothing that can fail
  always-true      an assertion that can never fail
  skipped          skipped, expected-to-fail or focused ("only") tests left in
  sleep            sleeps and fixed waits
  real-clock       the real date or time read inside a test
  real-network     a real HTTP call with no fake in the file
  shared-data      module-level mutable data that tests can change
  swallowed-error  an exception caught and ignored
  snapshot-only    a test whose only check is a snapshot

It only reads files. A finding is a place to look: confirm it before reporting, and in
existing code propose the fix to AK rather than applying it. Standard library only, Python 3.8+.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SKIP_FOLDERS = {"node_modules", "vendor", ".git", "dist", "build", ".venv", "venv", "__pycache__", ".dart_tool"}

TEST_FILE = {
    "python": re.compile(r"(^test_.*\.py$|_test\.py$)"),
    "php": re.compile(r"(Test\.php$)"),
    "js": re.compile(r"\.(test|spec)\.(js|jsx|ts|tsx|mjs|cjs)$"),
    "dart": re.compile(r"_test\.dart$"),
}

# Where a test starts, per language (the block runs until the next start or the end of the file).
TEST_START = {
    "python": re.compile(r"^\s*(async\s+)?def\s+(test_\w+)\s*\("),
    "php": re.compile(r"^\s*(it|test)\(\s*['\"](.+?)['\"]|^\s*public\s+function\s+(test\w+)\s*\("),
    "js": re.compile(r"^\s*(it|test)(\.(only|skip|todo|concurrent|each\([^)]*\)))*\(\s*['\"`](.+?)['\"`]"),
    "dart": re.compile(r"^\s*(test|testWidgets)\(\s*['\"](.+?)['\"]"),
}

ASSERTION = {
    "python": re.compile(r"\bassert\b|pytest\.raises|\.assert\w*\(|\bexpect\(|self\.fail\("),
    "php": re.compile(r"expect\(|->assert\w+\(|::assert\w+\(|\$this->assert\w+\(|->should\w*\(|expectException"),
    "js": re.compile(r"\bexpect\(|\bassert[\w.]*\(|\.should\b|toHaveBeenCalled"),
    "dart": re.compile(r"\bexpect\(|\bexpectLater\(|\bverify\w*\("),
}

LINE_SMELLS = {
    "python": [
        ("always-true", re.compile(r"\bassert\s+True\s*(#.*)?$|assertTrue\(\s*True\s*\)|\bassert\s+1\s*==\s*1\b")),
        ("skipped", re.compile(r"@pytest\.mark\.(skip|xfail)\b|pytest\.skip\(|@unittest\.skip|\.skipTest\(")),
        ("sleep", re.compile(r"\btime\.sleep\(|\basyncio\.sleep\(\s*[1-9]")),
        ("real-clock", re.compile(r"\bdatetime\.(now|utcnow|today)\(|\bdate\.today\(|\btime\.time\(")),
        ("swallowed-error", re.compile(r"^\s*except\b.*:\s*(pass)?\s*$")),
    ],
    "php": [
        ("always-true", re.compile(r"assertTrue\(\s*true\s*\)|expect\(\s*true\s*\)->toBeTrue\(\)|expect\(\s*true\s*\)->toBe\(\s*true\s*\)")),
        ("skipped", re.compile(r"->skip\(|markTestSkipped\(|markTestIncomplete\(|->todo\(|->only\(")),
        ("sleep", re.compile(r"\b(sleep|usleep)\(")),
        ("real-clock", re.compile(r"\b(now|today)\(\)|Carbon::now\(|\bdate\(\s*['\"]|\btime\(\)")),
        ("swallowed-error", re.compile(r"catch\s*\([^)]*\)\s*\{\s*\}")),
    ],
    "js": [
        ("always-true", re.compile(r"expect\(\s*true\s*\)\.(toBe\(\s*true\s*\)|toBeTruthy\(\))|expect\(\s*1\s*\)\.toBe\(\s*1\s*\)")),
        ("skipped", re.compile(r"\b(it|test|describe)\.(skip|only|todo)\(|\bx(it|describe|test)\(")),
        ("sleep", re.compile(r"waitForTimeout\(|setTimeout\([^)]*\b\d{3,}\b|\bsleep\(")),
        ("real-clock", re.compile(r"\bnew Date\(\s*\)|\bDate\.now\(")),
        ("swallowed-error", re.compile(r"catch\s*(\([^)]*\))?\s*\{\s*\}")),
    ],
    "dart": [
        ("always-true", re.compile(r"expect\(\s*true\s*,\s*(isTrue|true)\s*\)")),
        ("skipped", re.compile(r"\bskip:\s*(true|['\"])")),
        ("sleep", re.compile(r"\bsleep\(|Future\.delayed\(")),
        ("real-clock", re.compile(r"\bDateTime\.now\(")),
        ("swallowed-error", re.compile(r"catch\s*\([^)]*\)\s*\{\s*\}")),
    ],
}

# A real HTTP call in a test file that never sets up a fake for it.
NETWORK = {
    "python": (re.compile(r"\b(requests|httpx)\.(get|post|put|patch|delete)\(|urlopen\("),
               re.compile(r"\b(mock|patch|responses|respx|httpx_mock|requests_mock|monkeypatch|MockTransport)\b")),
    "php": (re.compile(r"\bHttp::(get|post|put|patch|delete)\(|curl_exec\(|file_get_contents\(\s*['\"]https?:"),
            re.compile(r"Http::fake\(|Mockery|->mock\(")),
    "js": (re.compile(r"\b(fetch|axios\.(get|post|put|patch|delete))\("),
           re.compile(r"\b(vi|jest)\.(mock|fn|spyOn)\(|msw|nock|fetchMock|route\(")),
    "dart": (re.compile(r"\bhttp\.(get|post|put|patch|delete)\("), re.compile(r"MockClient|Fake\w*Client|mocktail|mockito")),
}

SHARED_DATA = re.compile(r"^[A-Z_][A-Z0-9_]*\s*(:\s*[\w\[\], ]+)?=\s*(\[\s*\]|\{\s*\}|list\(\)|dict\(\)|set\(\))\s*$")
SNAPSHOT = re.compile(r"toMatchSnapshot\(|toMatchInlineSnapshot\(|matchesGoldenFile\(")


def language_of(path: Path) -> str | None:
    for language, pattern in TEST_FILE.items():
        if pattern.search(path.name):
            return language
    # Pest and PHPUnit files under a tests folder don't always end in Test.php.
    if path.suffix == ".php" and "tests" in path.parts and path.name not in ("Pest.php", "TestCase.php"):
        return "php"
    return None


def test_blocks(lines: list[str], language: str) -> list[tuple[int, str, list[str]]]:
    """Each test as (line number, name, its lines) — up to the next test or the end of the file."""
    starts = []
    for index, line in enumerate(lines):
        match = TEST_START[language].search(line)
        if match:
            name = next((group for group in reversed(match.groups()) if group and group not in ("it", "test")), "test")
            starts.append((index, name))
    blocks = []
    for position, (index, name) in enumerate(starts):
        end = starts[position + 1][0] if position + 1 < len(starts) else len(lines)
        blocks.append((index + 1, name, lines[index:end]))
    return blocks


def without_comments(line: str, language: str) -> str:
    marker = "#" if language == "python" else "//"
    return line.split(marker, 1)[0] if marker in line and "http" not in line else line


def scan_file(path: Path, language: str) -> list[dict]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    lines = text.splitlines()
    findings = []

    def add(kind: str, number: int, detail: str) -> None:
        findings.append({"smell": kind, "file": str(path), "line": number, "detail": detail.strip()[:140]})

    for number, raw in enumerate(lines, start=1):
        line = without_comments(raw, language)
        for kind, pattern in LINE_SMELLS[language]:
            if pattern.search(line):
                add(kind, number, raw)
        if language == "python" and SHARED_DATA.match(raw):
            add("shared-data", number, raw)
    call, fake = NETWORK[language]
    if not fake.search(text):
        for number, raw in enumerate(lines, start=1):
            if call.search(without_comments(raw, language)):
                add("real-network", number, raw)
    for number, name, block in test_blocks(lines, language):
        body = "\n".join(block)
        if not ASSERTION[language].search(body):
            add("no-assertion", number, name)
        elif SNAPSHOT.search(body) and len(ASSERTION[language].findall(body)) == len(SNAPSHOT.findall(body)):
            add("snapshot-only", number, name)
    return findings


def scan(folders: list[Path]) -> tuple[list[dict], int]:
    findings: list[dict] = []
    files = 0
    for folder in folders:
        paths = [folder] if folder.is_file() else sorted(folder.rglob("*"))
        for path in paths:
            if not path.is_file() or SKIP_FOLDERS & set(path.parts):
                continue
            language = language_of(path)
            if language:
                files += 1
                findings += scan_file(path, language)
    return findings, files


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("folders", nargs="+", type=Path)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    missing = [str(folder) for folder in args.folders if not folder.exists()]
    if missing:
        print(f"Not found: {', '.join(missing)}", file=sys.stderr)
        return 2
    findings, files = scan(args.folders)
    if args.json:
        print(json.dumps({"files": files, "findings": findings}))
        return 0
    print(f"{files} test file(s) read, {len(findings)} candidate(s).")
    for kind in sorted({finding["smell"] for finding in findings}):
        rows = [finding for finding in findings if finding["smell"] == kind]
        print(f"\n{kind} ({len(rows)})")
        for finding in rows[:40]:
            print(f"  {finding['file']}:{finding['line']}  {finding['detail']}")
        if len(rows) > 40:
            print(f"  … {len(rows) - 40} more")
    if findings:
        print("\nRead each one before judging. In existing code, propose the fix to AK (🟢) — don't change tests unasked.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
