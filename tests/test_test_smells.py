"""test_smells.py lists weak tests in four languages and stays quiet on sound ones."""
import json
import subprocess
import sys
from pathlib import Path

SCRIPT = (Path(__file__).resolve().parents[1] / "plugins/arkar-dev-standards/skills/arkar-testing"
          / "scripts/test_smells.py")

WEAK_PYTHON = '''import time
from datetime import datetime

import requests

SHARED = []


def test_nothing_is_checked():
    total = 1 + 1


def test_always_true():
    assert True


@pytest.mark.skip(reason="fails on CI")
def test_skipped():
    assert compute() == 3


def test_sleeps_and_reads_the_clock():
    time.sleep(1)
    assert due(datetime.now())


def test_calls_the_network():
    assert requests.get("https://example.com/api").status_code == 200


def test_swallows_errors():
    try:
        risky()
    except Exception:
        pass
    assert done()
'''

SOUND_PYTHON = '''from datetime import datetime

FIXED_NOW = datetime(2026, 3, 2, 9, 0)


def test_reminder_is_due_seven_days_before():
    assert is_due(datetime(2026, 3, 9, 9, 0), now=FIXED_NOW) is True


def test_refuses_a_second_cancel(client):
    client.post("/leave/1/cancel")
    response = client.post("/leave/1/cancel")
    assert response.status_code == 409
'''

WEAK_PEST = """<?php

it('lists work orders', function () {
    $this->get('/work-orders');
});

it('is skipped', function () {
    expect(total())->toBe(3);
})->skip();

it('waits', function () {
    sleep(2);
    expect(true)->toBeTrue();
});
"""

WEAK_JS = """import { render } from '@testing-library/react';

it('renders', () => {
  const { container } = render(<Panel />);
  expect(container).toMatchSnapshot();
});

it.only('shows the assignee', async () => {
  await page.waitForTimeout(2000);
  expect(true).toBe(true);
});

test('does nothing', () => {
  render(<Panel />);
});
"""

WEAK_DART = """import 'package:flutter_test/flutter_test.dart';

void main() {
  test('adds', () {
    final total = 1 + 1;
  });

  test('later', () async {
    await Future.delayed(const Duration(seconds: 1));
    expect(true, isTrue);
  }, skip: true);
}
"""


def smells(folder: Path) -> dict:
    result = subprocess.run([sys.executable, str(SCRIPT), str(folder), "--json"], capture_output=True, text=True, timeout=60)
    assert result.returncode == 0, result.stderr
    found: dict = {}
    for finding in json.loads(result.stdout)["findings"]:
        found.setdefault(Path(finding["file"]).name, set()).add(finding["smell"])
    return found


def test_weak_tests_are_listed_in_each_language(tmp_path):
    (tmp_path / "tests" / "Feature").mkdir(parents=True)
    (tmp_path / "tests" / "test_weak.py").write_text(WEAK_PYTHON)
    (tmp_path / "tests" / "Feature" / "WorkOrderTest.php").write_text(WEAK_PEST)
    (tmp_path / "tests" / "panel.test.jsx").write_text(WEAK_JS)
    (tmp_path / "tests" / "sum_test.dart").write_text(WEAK_DART)
    found = smells(tmp_path / "tests")
    assert found["test_weak.py"] >= {"no-assertion", "always-true", "skipped", "sleep", "real-clock", "real-network",
                                     "shared-data", "swallowed-error"}
    assert found["WorkOrderTest.php"] >= {"no-assertion", "skipped", "sleep", "always-true"}
    assert found["panel.test.jsx"] >= {"snapshot-only", "skipped", "sleep", "always-true", "no-assertion"}
    assert found["sum_test.dart"] >= {"no-assertion", "sleep", "skipped", "always-true"}


def test_sound_tests_and_non_test_files_raise_nothing(tmp_path):
    (tmp_path / "tests").mkdir()
    (tmp_path / "tests" / "test_sound.py").write_text(SOUND_PYTHON)
    (tmp_path / "tests" / "helpers.py").write_text("import time\n\ndef wait():\n    time.sleep(1)\n")
    assert smells(tmp_path / "tests") == {}


def test_a_missing_folder_is_an_error(tmp_path):
    result = subprocess.run([sys.executable, str(SCRIPT), str(tmp_path / "nope")], capture_output=True, text=True)
    assert result.returncode == 2 and "Not found" in result.stderr
