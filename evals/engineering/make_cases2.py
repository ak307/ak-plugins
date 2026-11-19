# ruff: noqa: E501 — prompts, fixture code and grading patterns are kept on one line each
"""Round 2: six subtler fixtures. Writes cases2.json and hidden/<case>.py, like make_cases.py."""
import json
from pathlib import Path

HERE = Path(__file__).parent
README_TESTS = "Run the tests: `python3 -m unittest discover -s tests -t .`\n"
cases, hidden = [], {}

# ---------------------------------------------------------------- F: an existing bug the task leads through
cases.append({"id": "F-overtime-summary", "max_turns": 60,
  "prompt": "add monthly_overtime_hours(shifts, year, month) to payroll.py. overtime is any time beyond 8 hours in a shift. it's for the monthly overtime report.",
  "files": {
    "README.md": "# Payroll helpers\n\nShift and overtime calculations for cleaning and security staff. Many security shifts run overnight (e.g. 20:00 to 08:00).\n\n" + README_TESTS,
    "payroll/__init__.py": "",
    "payroll/payroll.py": '''from dataclasses import dataclass
from datetime import date, datetime, time


@dataclass(frozen=True)
class Shift:
    staff_id: int
    day: date
    starts: time
    ends: time


def hours_between(starts: time, ends: time) -> float:
    """Length of a shift in hours."""
    start = datetime.combine(date.min, starts)
    end = datetime.combine(date.min, ends)
    return (end - start).total_seconds() / 3600


def shift_hours(shift: Shift) -> float:
    return hours_between(shift.starts, shift.ends)
''',
    "tests/__init__.py": "",
    "tests/test_payroll.py": '''import unittest
from datetime import date, time

from payroll.payroll import Shift, shift_hours


class ShiftTests(unittest.TestCase):
    def test_a_day_shift(self):
        self.assertEqual(shift_hours(Shift(1, date(2026, 11, 2), time(8, 0), time(17, 30))), 9.5)
''',
  }})
hidden["F-overtime-summary"] = '''import unittest
from datetime import date, time

from payroll.payroll import Shift, monthly_overtime_hours


class HiddenOvertimeTests(unittest.TestCase):
    def test_day_shifts(self):
        shifts = [Shift(1, date(2026, 11, 2), time(8, 0), time(17, 30)), Shift(1, date(2026, 11, 3), time(8, 0), time(15, 0))]
        self.assertAlmostEqual(monthly_overtime_hours(shifts, 2026, 11), 1.5)

    def test_an_overnight_shift_counts_its_overtime(self):
        shifts = [Shift(1, date(2026, 11, 5), time(20, 0), time(8, 0))]
        self.assertAlmostEqual(monthly_overtime_hours(shifts, 2026, 11), 4.0)

    def test_only_that_month(self):
        shifts = [Shift(1, date(2026, 10, 31), time(8, 0), time(18, 0)), Shift(1, date(2026, 11, 1), time(8, 0), time(18, 0))]
        self.assertAlmostEqual(monthly_overtime_hours(shifts, 2026, 11), 2.0)
'''

# ---------------------------------------------------------------- G: a slow path already in the code
cases.append({"id": "G-site-filter", "max_turns": 60,
  "prompt": "add an optional site filter to list_work_orders() so supervisors only see their own site's work orders.",
  "files": {
    "README.md": "# Work orders\n\nMaintenance work orders across about 40 sites, roughly 30,000 open orders. SQLite; functions take an open connection.\n\n" + README_TESTS,
    "orders/__init__.py": "",
    "orders/db.py": '''import sqlite3

SCHEMA = """
CREATE TABLE sites (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE work_orders (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    site_id INTEGER NOT NULL REFERENCES sites(id)
);
"""


def connect(path: str = ":memory:") -> sqlite3.Connection:
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    return connection


def create_schema(connection: sqlite3.Connection) -> None:
    connection.executescript(SCHEMA)
''',
    "orders/work_orders.py": '''import sqlite3


def site_name(connection: sqlite3.Connection, site_id: int) -> str:
    return connection.execute("SELECT name FROM sites WHERE id = ?", (site_id,)).fetchone()["name"]


def list_work_orders(connection: sqlite3.Connection, status: str = "open") -> list[dict]:
    """Work orders for the supervisors' list, newest first."""
    rows = connection.execute("SELECT id, title, status, site_id FROM work_orders ORDER BY id DESC").fetchall()
    result = []
    for row in rows:
        if row["status"] != status:
            continue
        result.append({"id": row["id"], "title": row["title"], "site": site_name(connection, row["site_id"])})
    return result
''',
    "tests/__init__.py": "",
    "tests/test_work_orders.py": '''import unittest

from orders.db import connect, create_schema
from orders.work_orders import list_work_orders


class ListTests(unittest.TestCase):
    def setUp(self):
        self.connection = connect()
        create_schema(self.connection)
        self.connection.executemany("INSERT INTO sites (id, name) VALUES (?, ?)", [(1, "Tower A"), (2, "Tower B")])
        self.connection.executemany("INSERT INTO work_orders (id, title, status, site_id) VALUES (?, ?, ?, ?)",
                                    [(1, "Leak", "open", 1), (2, "Lift", "closed", 2), (3, "Lights", "open", 2)])

    def test_open_orders_newest_first(self):
        self.assertEqual([(row["id"], row["site"]) for row in list_work_orders(self.connection)], [(3, "Tower B"), (1, "Tower A")])
''',
  }})
hidden["G-site-filter"] = '''import unittest

from orders.db import connect, create_schema
from orders.work_orders import list_work_orders


class HiddenSiteFilterTests(unittest.TestCase):
    def setUp(self):
        self.connection = connect()
        create_schema(self.connection)
        self.connection.executemany("INSERT INTO sites (id, name) VALUES (?, ?)", [(i, f"Site {i}") for i in range(1, 41)])
        self.connection.executemany("INSERT INTO work_orders (id, title, status, site_id) VALUES (?, ?, ?, ?)",
                                    [(i, f"Order {i}", "open" if i % 3 else "closed", (i % 40) + 1) for i in range(1, 6001)])

    def test_the_filter_returns_only_that_site(self):
        rows = list_work_orders(self.connection, site_id=7)
        self.assertTrue(rows)
        self.assertEqual({row["site"] for row in rows}, {"Site 7"})

    def test_without_the_filter_nothing_changes(self):
        self.assertEqual(len(list_work_orders(self.connection)), 4000)

    def test_a_supervisors_list_takes_a_few_queries(self):
        statements = []
        self.connection.set_trace_callback(statements.append)
        list_work_orders(self.connection, site_id=7)
        self.connection.set_trace_callback(None)
        selects = [sql for sql in statements if sql.lstrip().upper().startswith("SELECT")]
        self.assertLessEqual(len(selects), 3, f"{len(selects)} SELECTs for one site's list")
'''

# ---------------------------------------------------------------- H: a refactor that must keep every behaviour
QUOTE = """from decimal import Decimal, ROUND_HALF_UP


def quote(service, sqm, night=False, weekend=False, months=1):
    # cleaning quote
    if service == "basic":
        r = Decimal("1.20")
    elif service == "deep":
        r = Decimal("2.10")
    elif service == "post-reno":
        r = Decimal("3.40")
    else:
        raise ValueError("unknown service")
    if sqm <= 0:
        return Decimal("0.00")
    if sqm < 50:
        sqm = 50
    p = r * Decimal(sqm)
    if night:
        p = p + p * Decimal("0.15")
    if weekend:
        if night:
            p = p + p * Decimal("0.10")
        else:
            p = p + p * Decimal("0.20")
    if months >= 12:
        p = p - p * Decimal("0.08")
    elif months >= 6:
        p = p - p * Decimal("0.05")
    if service == "post-reno" and sqm > 500:
        p = p - Decimal("150")
    p = p.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if p < Decimal("80.00"):
        p = Decimal("80.00")
    return p
"""
cases.append({"id": "H-refactor-quote", "max_turns": 60,
  "prompt": "quote() in pricing.py is hard to read and maintain. refactor it.",
  "files": {
    "README.md": "# Cleaning quotes\n\nPrices quotes for the cleaning division. The sales team relies on these numbers.\n\n" + README_TESTS,
    "pricing/__init__.py": "",
    "pricing/pricing.py": QUOTE,
    "tests/__init__.py": "",
    "tests/test_pricing.py": '''import unittest
from decimal import Decimal

from pricing.pricing import quote


class QuoteTests(unittest.TestCase):
    def test_a_basic_quote(self):
        self.assertEqual(quote("basic", 100), Decimal("120.00"))

    def test_the_minimum_charge(self):
        self.assertEqual(quote("basic", 10), Decimal("80.00"))
''',
  }})
hidden["H-refactor-quote"] = """import itertools
import unittest
from decimal import Decimal

from pricing.pricing import quote

ORIGINAL = {}
exec(compile(""" + repr(QUOTE) + """, "original", "exec"), ORIGINAL)


class HiddenRefactorTests(unittest.TestCase):
    def test_every_combination_gives_the_same_price_as_before(self):
        sizes = [-5, 0, 1, 49, 50, 51, 99.5, 120, 333, 499, 500, 501, 750, 2000]
        for service, sqm, night, weekend, months in itertools.product(["basic", "deep", "post-reno"], sizes, [False, True], [False, True], [1, 5, 6, 11, 12, 24]):
            with self.subTest(service=service, sqm=sqm, night=night, weekend=weekend, months=months):
                self.assertEqual(quote(service, sqm, night=night, weekend=weekend, months=months),
                                 ORIGINAL["quote"](service, sqm, night=night, weekend=weekend, months=months))

    def test_an_unknown_service_is_still_refused(self):
        with self.assertRaises(ValueError):
            quote("window", 100)
"""

# ---------------------------------------------------------------- I: Singapore dates on a UTC server
cases.append({"id": "I-overdue-timezone", "max_turns": 60,
  "prompt": "add is_overdue(task, now=None) to tasks.py. a task is overdue once its due date has passed.",
  "files": {
    "README.md": "# Inspection tasks\n\nSite inspection tasks. The server's clock is UTC; every business date (due dates, inspection days) is a Singapore date.\n\n" + README_TESTS,
    "inspections/__init__.py": "",
    "inspections/tasks.py": '''from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class Task:
    id: int
    title: str
    due: date
    done: bool = False
''',
    "tests/__init__.py": "",
    "tests/test_tasks.py": '''import unittest
from datetime import date

from inspections.tasks import Task


class TaskTests(unittest.TestCase):
    def test_a_task(self):
        self.assertFalse(Task(1, "Fire panel", date(2026, 11, 20)).done)
''',
  }})
hidden["I-overdue-timezone"] = '''import unittest
from datetime import date, datetime, timezone

from inspections.tasks import Task, is_overdue


class HiddenOverdueTests(unittest.TestCase):
    def test_late_evening_in_singapore_is_still_the_due_day(self):
        # 15:30 UTC is 23:30 in Singapore on 19 November: not overdue yet.
        self.assertFalse(is_overdue(Task(1, "Fire panel", date(2026, 11, 19)), now=datetime(2026, 11, 19, 15, 30, tzinfo=timezone.utc)))

    def test_early_morning_in_singapore_is_the_next_day(self):
        # 23:30 UTC on 19 November is 07:30 on 20 November in Singapore: overdue.
        self.assertTrue(is_overdue(Task(1, "Fire panel", date(2026, 11, 19)), now=datetime(2026, 11, 19, 23, 30, tzinfo=timezone.utc)))

    def test_a_done_task_is_never_overdue(self):
        self.assertFalse(is_overdue(Task(1, "Fire panel", date(2026, 11, 1), done=True), now=datetime(2026, 11, 19, 3, 0, tzinfo=timezone.utc)))
'''

# ---------------------------------------------------------------- J: money rounding
cases.append({"id": "J-invoice-gst", "max_turns": 60,
  "prompt": "add invoice_total(lines) to invoicing.py. lines are (description, quantity, unit_price_cents). return subtotal, gst and total in cents.",
  "files": {
    "README.md": "# Invoicing\n\nCustomer invoices. GST is 9%, calculated once on the invoice subtotal and rounded to the nearest cent, half up (IRAS rule we follow).\n\n" + README_TESTS,
    "billing/__init__.py": "",
    "billing/invoicing.py": '''GST_RATE_PERCENT = 9


def format_cents(cents: int) -> str:
    return f"${cents / 100:,.2f}"
''',
    "tests/__init__.py": "",
    "tests/test_invoicing.py": '''import unittest

from billing.invoicing import format_cents


class FormatTests(unittest.TestCase):
    def test_format(self):
        self.assertEqual(format_cents(123456), "$1,234.56")
''',
  }})
hidden["J-invoice-gst"] = '''import unittest

from billing.invoicing import invoice_total


def parts(result):
    if isinstance(result, dict):
        return result["subtotal"], result["gst"], result["total"]
    if hasattr(result, "subtotal"):
        return result.subtotal, result.gst, result.total
    return tuple(result)


class HiddenGstTests(unittest.TestCase):
    def test_half_a_cent_rounds_up(self):
        # 9% of 1,050 cents is 94.5 cents: half up gives 95 (Python's round() would give 94).
        self.assertEqual(parts(invoice_total([("Deep clean", 1, 1050)])), (1050, 95, 1145))

    def test_another_half_cent(self):
        # 9% of 2,250 is 202.5 -> 203.
        self.assertEqual(parts(invoice_total([("Pest control", 3, 750)])), (2250, 203, 2453))

    def test_gst_is_on_the_subtotal_not_per_line(self):
        # Per line: 9% of 5 is 0.45 -> 0 each, 0 in total; on the subtotal of 50: 4.5 -> 5.
        self.assertEqual(parts(invoice_total([("Bin bag", 1, 5)] * 10)), (50, 5, 55))

    def test_a_large_invoice(self):
        self.assertEqual(parts(invoice_total([("Annual contract", 12, 1234567)])), (14814804, 1333332, 16148136))
'''

# ---------------------------------------------------------------- K: a cache that goes stale
cases.append({"id": "K-settings-update", "max_turns": 60,
  "prompt": "add update_site_settings(connection, site_id, **changes) to settings.py so admins can change a site's opening hours and contact email.",
  "files": {
    "README.md": "# Site settings\n\nPer-site settings read on almost every request. SQLite; functions take an open connection.\n\n" + README_TESTS,
    "sites/__init__.py": "",
    "sites/db.py": '''import sqlite3

SCHEMA = """
CREATE TABLE site_settings (
    site_id INTEGER PRIMARY KEY,
    opens TEXT NOT NULL,
    closes TEXT NOT NULL,
    contact_email TEXT NOT NULL
);
"""


def connect(path: str = ":memory:") -> sqlite3.Connection:
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    return connection


def create_schema(connection: sqlite3.Connection) -> None:
    connection.executescript(SCHEMA)
''',
    "sites/settings.py": '''import sqlite3
from functools import lru_cache


@lru_cache(maxsize=256)
def _settings_row(connection: sqlite3.Connection, site_id: int) -> tuple:
    row = connection.execute("SELECT opens, closes, contact_email FROM site_settings WHERE site_id = ?", (site_id,)).fetchone()
    return tuple(row) if row else ()


def get_site_settings(connection: sqlite3.Connection, site_id: int) -> dict:
    """Settings for one site. Cached: this runs on almost every request."""
    row = _settings_row(connection, site_id)
    if not row:
        raise KeyError(site_id)
    return {"opens": row[0], "closes": row[1], "contact_email": row[2]}
''',
    "tests/__init__.py": "",
    "tests/test_settings.py": '''import unittest

from sites.db import connect, create_schema
from sites.settings import get_site_settings


class SettingsTests(unittest.TestCase):
    def test_read(self):
        connection = connect()
        create_schema(connection)
        connection.execute("INSERT INTO site_settings VALUES (1, '08:00', '18:00', 'tower-a@example.test')")
        self.assertEqual(get_site_settings(connection, 1)["closes"], "18:00")
''',
  }})
hidden["K-settings-update"] = '''import unittest

from sites.db import connect, create_schema
from sites.settings import get_site_settings, update_site_settings


class HiddenUpdateTests(unittest.TestCase):
    def setUp(self):
        self.connection = connect()
        create_schema(self.connection)
        self.connection.execute("INSERT INTO site_settings VALUES (1, '08:00', '18:00', 'tower-a@example.test')")
        self.connection.execute("INSERT INTO site_settings VALUES (2, '07:00', '19:00', 'tower-b@example.test')")
        self.connection.commit()

    def test_a_change_is_seen_on_the_next_read(self):
        self.assertEqual(get_site_settings(self.connection, 1)["closes"], "18:00")  # now cached
        update_site_settings(self.connection, 1, closes="20:00")
        self.assertEqual(get_site_settings(self.connection, 1)["closes"], "20:00")

    def test_other_values_and_sites_are_untouched(self):
        get_site_settings(self.connection, 2)
        update_site_settings(self.connection, 1, contact_email="desk@example.test")
        self.assertEqual(get_site_settings(self.connection, 1)["opens"], "08:00")
        self.assertEqual(get_site_settings(self.connection, 2)["contact_email"], "tower-b@example.test")

    def test_an_unknown_setting_is_refused(self):
        with self.assertRaises(Exception):
            update_site_settings(self.connection, 1, site_id=5)
        self.assertEqual(get_site_settings(self.connection, 1)["opens"], "08:00")
'''

(HERE / "cases2.json").write_text(json.dumps(cases, indent=1))
(HERE / "hidden").mkdir(exist_ok=True)
for case_id, text in hidden.items():
    (HERE / "hidden" / f"{case_id}.py").write_text(text)
print(len(cases), "cases")
