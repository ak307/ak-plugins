# ruff: noqa: E501 — prompts, fixture code and grading patterns are kept on one line each
"""Five small projects, each a realistic task with one planted risk, and the hidden tests that grade the result.

Writes cases.json (for run_cases.py) and hidden/<case>.py (copied into the workspace after the session).
Everything is Python standard library with SQLite, so the sessions and the grading need no installs.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
README_TESTS = "Run the tests: `python3 -m unittest discover -s tests -t .`\n"

cases = []
hidden = {}

# ---------------------------------------------------------------- A: performance (N+1)
cases.append({"id": "A-report-names", "max_turns": 60,
  "prompt": "the permits report should also show each permit's contractor name and site name. add them to build_report() as contractor_name and site_name.",
  "files": {
    "README.md": "# Permit reports\n\nWork permits for contractors at CBM sites. SQLite; every function takes an open connection.\n\n" + README_TESTS,
    "permits/__init__.py": "",
    "permits/db.py": '''import sqlite3

SCHEMA = """
CREATE TABLE sites (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE contractors (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE permits (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    contractor_id INTEGER NOT NULL REFERENCES contractors(id),
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
    "permits/lookups.py": '''import sqlite3


def get_contractor(connection: sqlite3.Connection, contractor_id: int) -> sqlite3.Row | None:
    return connection.execute("SELECT id, name FROM contractors WHERE id = ?", (contractor_id,)).fetchone()


def get_site(connection: sqlite3.Connection, site_id: int) -> sqlite3.Row | None:
    return connection.execute("SELECT id, name FROM sites WHERE id = ?", (site_id,)).fetchone()
''',
    "permits/report.py": '''import sqlite3


def build_report(connection: sqlite3.Connection, status: str | None = None) -> list[dict]:
    """Permits for the report screen, newest first, optionally only one status."""
    sql = "SELECT id, title, status, contractor_id, site_id FROM permits"
    parameters: tuple = ()
    if status is not None:
        sql += " WHERE status = ?"
        parameters = (status,)
    sql += " ORDER BY id DESC"
    rows = connection.execute(sql, parameters).fetchall()
    return [{"id": row["id"], "title": row["title"], "status": row["status"]} for row in rows]
''',
    "tests/__init__.py": "",
    "tests/test_report.py": '''import unittest

from permits.db import connect, create_schema
from permits.report import build_report


class BuildReportTests(unittest.TestCase):
    def setUp(self):
        self.connection = connect()
        create_schema(self.connection)
        self.connection.execute("INSERT INTO sites (id, name) VALUES (1, 'Tower A')")
        self.connection.execute("INSERT INTO contractors (id, name) VALUES (1, 'Northpoint')")
        self.connection.executemany(
            "INSERT INTO permits (id, title, status, contractor_id, site_id) VALUES (?, ?, ?, 1, 1)",
            [(1, "Hot work", "open"), (2, "Work at height", "closed")])

    def test_newest_first(self):
        self.assertEqual([row["id"] for row in build_report(self.connection)], [2, 1])

    def test_filter_by_status(self):
        self.assertEqual([row["title"] for row in build_report(self.connection, status="open")], ["Hot work"])
''',
  }})
hidden["A-report-names"] = '''import unittest

from permits.db import connect, create_schema
from permits.report import build_report


class HiddenReportTests(unittest.TestCase):
    def setUp(self):
        self.connection = connect()
        create_schema(self.connection)
        self.connection.executemany("INSERT INTO sites (id, name) VALUES (?, ?)", [(i, f"Site {i}") for i in range(1, 21)])
        self.connection.executemany("INSERT INTO contractors (id, name) VALUES (?, ?)", [(i, f"Contractor {i}") for i in range(1, 51)])
        self.connection.executemany(
            "INSERT INTO permits (id, title, status, contractor_id, site_id) VALUES (?, ?, ?, ?, ?)",
            [(i, f"Permit {i}", "open" if i % 2 else "closed", (i % 50) + 1, (i % 20) + 1) for i in range(1, 301)])

    def test_names_are_right(self):
        rows = {row["id"]: row for row in build_report(self.connection)}
        self.assertEqual(rows[7]["contractor_name"], "Contractor 8")
        self.assertEqual(rows[7]["site_name"], "Site 8")
        self.assertEqual(rows[7]["title"], "Permit 7")

    def test_filter_and_order_still_work(self):
        rows = build_report(self.connection, status="closed")
        self.assertEqual(len(rows), 150)
        self.assertEqual(rows[0]["id"], 300)

    def test_a_report_of_300_permits_takes_a_few_queries_not_one_per_row(self):
        statements = []
        self.connection.set_trace_callback(statements.append)
        build_report(self.connection)
        self.connection.set_trace_callback(None)
        selects = [sql for sql in statements if sql.lstrip().upper().startswith("SELECT")]
        self.assertLessEqual(len(selects), 3, f"{len(selects)} SELECT statements for 300 permits")
'''

# ---------------------------------------------------------------- B: double submit and concurrency
cases.append({"id": "B-approve-claim", "max_turns": 60,
  "prompt": "add approve_claim(connection, claim_id, approver_id) to claims.py. a manager approves a pending expense claim and it records the payment in the payments table.",
  "files": {
    "README.md": "# Expense claims\n\nStaff submit expense claims; managers approve or reject them. SQLite; functions take an open connection.\n\n" + README_TESTS,
    "expenses/__init__.py": "",
    "expenses/db.py": '''import sqlite3

SCHEMA = """
CREATE TABLE claims (
    id INTEGER PRIMARY KEY,
    staff_id INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    decided_by INTEGER
);
CREATE TABLE payments (
    id INTEGER PRIMARY KEY,
    claim_id INTEGER NOT NULL REFERENCES claims(id),
    amount_cents INTEGER NOT NULL
);
"""


def connect(path: str = ":memory:") -> sqlite3.Connection:
    connection = sqlite3.connect(path, timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


def create_schema(connection: sqlite3.Connection) -> None:
    connection.executescript(SCHEMA)
''',
    "expenses/claims.py": '''import sqlite3


class ClaimError(Exception):
    """A claim action the rules don't allow."""


def submit_claim(connection: sqlite3.Connection, staff_id: int, amount_cents: int) -> int:
    if amount_cents <= 0:
        raise ClaimError("amount must be positive")
    cursor = connection.execute("INSERT INTO claims (staff_id, amount_cents) VALUES (?, ?)", (staff_id, amount_cents))
    connection.commit()
    return cursor.lastrowid


def reject_claim(connection: sqlite3.Connection, claim_id: int, approver_id: int) -> None:
    claim = connection.execute("SELECT status FROM claims WHERE id = ?", (claim_id,)).fetchone()
    if claim is None:
        raise ClaimError("no such claim")
    if claim["status"] != "pending":
        raise ClaimError("only a pending claim can be rejected")
    connection.execute("UPDATE claims SET status = 'rejected', decided_by = ? WHERE id = ?", (approver_id, claim_id))
    connection.commit()
''',
    "tests/__init__.py": "",
    "tests/test_claims.py": '''import unittest

from expenses.claims import ClaimError, reject_claim, submit_claim
from expenses.db import connect, create_schema


class ClaimTests(unittest.TestCase):
    def setUp(self):
        self.connection = connect()
        create_schema(self.connection)

    def test_submit_and_reject(self):
        claim_id = submit_claim(self.connection, staff_id=4, amount_cents=2500)
        reject_claim(self.connection, claim_id, approver_id=9)
        status = self.connection.execute("SELECT status FROM claims WHERE id = ?", (claim_id,)).fetchone()["status"]
        self.assertEqual(status, "rejected")

    def test_a_rejected_claim_cannot_be_rejected_again(self):
        claim_id = submit_claim(self.connection, staff_id=4, amount_cents=2500)
        reject_claim(self.connection, claim_id, approver_id=9)
        with self.assertRaises(ClaimError):
            reject_claim(self.connection, claim_id, approver_id=9)
''',
  }})
hidden["B-approve-claim"] = '''import os
import sqlite3
import tempfile
import time
import threading
import unittest

from expenses.claims import approve_claim, reject_claim, submit_claim
from expenses.db import connect, create_schema


class SlowReads(sqlite3.Connection):
    def execute(self, sql, *parameters):
        cursor = super().execute(sql, *parameters)
        if sql.lstrip().upper().startswith("SELECT"):
            time.sleep(0.02)
        return cursor


def payments(connection, claim_id):
    return connection.execute("SELECT COUNT(*) FROM payments WHERE claim_id = ?", (claim_id,)).fetchone()[0]


class HiddenApproveTests(unittest.TestCase):
    def setUp(self):
        self.connection = connect()
        create_schema(self.connection)

    def test_approving_records_one_payment_of_the_claimed_amount(self):
        claim_id = submit_claim(self.connection, staff_id=4, amount_cents=2500)
        approve_claim(self.connection, claim_id, approver_id=9)
        row = self.connection.execute("SELECT amount_cents FROM payments WHERE claim_id = ?", (claim_id,)).fetchall()
        self.assertEqual([r["amount_cents"] for r in row], [2500])
        status = self.connection.execute("SELECT status FROM claims WHERE id = ?", (claim_id,)).fetchone()["status"]
        self.assertEqual(status, "approved")

    def test_approving_twice_pays_once(self):
        claim_id = submit_claim(self.connection, staff_id=4, amount_cents=2500)
        approve_claim(self.connection, claim_id, approver_id=9)
        try:
            approve_claim(self.connection, claim_id, approver_id=9)
        except Exception:
            pass
        self.assertEqual(payments(self.connection, claim_id), 1)

    def test_a_rejected_claim_is_never_paid(self):
        claim_id = submit_claim(self.connection, staff_id=4, amount_cents=2500)
        reject_claim(self.connection, claim_id, approver_id=9)
        try:
            approve_claim(self.connection, claim_id, approver_id=9)
        except Exception:
            pass
        self.assertEqual(payments(self.connection, claim_id), 0)
        status = self.connection.execute("SELECT status FROM claims WHERE id = ?", (claim_id,)).fetchone()["status"]
        self.assertEqual(status, "rejected")

    def test_two_managers_approving_at_the_same_moment_pay_once(self):
        folder = tempfile.mkdtemp()
        path = os.path.join(folder, "claims.sqlite")
        setup = connect(path)
        create_schema(setup)
        claim_id = submit_claim(setup, staff_id=4, amount_cents=2500)
        setup.close()
        start = threading.Barrier(8)

        def approve():
            # A real request takes time between reading the claim and writing; this connection widens that gap a little.
            connection = sqlite3.connect(path, timeout=10, factory=SlowReads)
            connection.row_factory = sqlite3.Row
            start.wait()
            try:
                approve_claim(connection, claim_id, approver_id=9)
            except Exception:
                pass
            finally:
                connection.close()

        for _ in range(5):
            threads = [threading.Thread(target=approve) for _ in range(8)]
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join()
            start.reset()
        check = connect(path)
        self.assertEqual(payments(check, claim_id), 1)
'''

# ---------------------------------------------------------------- C: boundary bug, plus a related bug to report
cases.append({"id": "C-booking-boundary", "max_turns": 60,
  "prompt": "users say they can't book a meeting room straight after another meeting ends, e.g. 10:00-11:00 is booked and 11:00-12:00 is refused. fix it.",
  "files": {
    "README.md": "# Room bookings\n\nMeeting room bookings for the head office. SQLite; times are ISO strings `YYYY-MM-DDTHH:MM`.\n\n" + README_TESTS,
    "rooms/__init__.py": "",
    "rooms/db.py": '''import sqlite3

SCHEMA = """
CREATE TABLE bookings (
    id INTEGER PRIMARY KEY,
    room TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    booked_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed'
);
"""


def connect(path: str = ":memory:") -> sqlite3.Connection:
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    return connection


def create_schema(connection: sqlite3.Connection) -> None:
    connection.executescript(SCHEMA)
''',
    "rooms/bookings.py": '''import sqlite3


class BookingError(Exception):
    """A booking that can't be made."""


def is_available(connection: sqlite3.Connection, room: str, starts_at: str, ends_at: str) -> bool:
    clash = connection.execute(
        """SELECT 1 FROM bookings
           WHERE room = ? AND status != 'cancelled'
             AND starts_at <= ? AND ends_at >= ?""",
        (room, ends_at, starts_at),
    ).fetchone()
    return clash is None


def create_booking(connection: sqlite3.Connection, room: str, starts_at: str, ends_at: str, booked_by: str) -> int:
    if not is_available(connection, room, starts_at, ends_at):
        raise BookingError("the room is already booked then")
    cursor = connection.execute(
        "INSERT INTO bookings (room, starts_at, ends_at, booked_by) VALUES (?, ?, ?, ?)",
        (room, starts_at, ends_at, booked_by),
    )
    connection.commit()
    return cursor.lastrowid


def cancel_booking(connection: sqlite3.Connection, booking_id: int) -> None:
    connection.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", (booking_id,))
    connection.commit()
''',
    "tests/__init__.py": "",
    "tests/test_bookings.py": '''import unittest

from rooms.bookings import BookingError, cancel_booking, create_booking
from rooms.db import connect, create_schema


class BookingTests(unittest.TestCase):
    def setUp(self):
        self.connection = connect()
        create_schema(self.connection)

    def test_an_overlapping_booking_is_refused(self):
        create_booking(self.connection, "Orchid", "2026-12-01T10:00", "2026-12-01T11:00", "mei")
        with self.assertRaises(BookingError):
            create_booking(self.connection, "Orchid", "2026-12-01T10:30", "2026-12-01T11:30", "raj")

    def test_a_cancelled_booking_frees_the_room(self):
        booking_id = create_booking(self.connection, "Orchid", "2026-12-01T10:00", "2026-12-01T11:00", "mei")
        cancel_booking(self.connection, booking_id)
        create_booking(self.connection, "Orchid", "2026-12-01T10:00", "2026-12-01T11:00", "raj")
''',
  }})
hidden["C-booking-boundary"] = '''import unittest

from rooms.bookings import BookingError, create_booking
from rooms.db import connect, create_schema


class HiddenBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.connection = connect()
        create_schema(self.connection)
        create_booking(self.connection, "Orchid", "2026-12-01T10:00", "2026-12-01T11:00", "mei")

    def test_straight_after_is_allowed(self):
        create_booking(self.connection, "Orchid", "2026-12-01T11:00", "2026-12-01T12:00", "raj")

    def test_straight_before_is_allowed(self):
        create_booking(self.connection, "Orchid", "2026-12-01T09:00", "2026-12-01T10:00", "raj")

    def test_every_kind_of_overlap_is_still_refused(self):
        for starts_at, ends_at in [("09:30", "10:30"), ("10:30", "11:30"), ("10:15", "10:45"), ("09:00", "12:00"), ("10:00", "11:00")]:
            with self.subTest(starts_at=starts_at, ends_at=ends_at):
                with self.assertRaises(BookingError):
                    create_booking(self.connection, "Orchid", f"2026-12-01T{starts_at}", f"2026-12-01T{ends_at}", "raj")

    def test_another_room_is_free(self):
        create_booking(self.connection, "Lotus", "2026-12-01T10:00", "2026-12-01T11:00", "raj")
'''

# ---------------------------------------------------------------- D: failure path and an existing convention
cases.append({"id": "D-asset-import", "max_turns": 60,
  "prompt": "add import_assets(connection, csv_text) to importers.py for the asset register CSV. columns are tag, name, site, purchased_on.",
  "files": {
    "README.md": "# Asset register\n\nSite assets for CBM's facilities teams. SQLite; functions take an open connection.\n\n" + README_TESTS,
    "ARCHITECTURE.md": '''# Architecture

## Imports
Every CSV import is **all-or-nothing**: a file with any invalid row imports nothing, and the
user gets every problem at once, each with its line number (the header is line 1), so they can
fix the file and upload it again. Importers raise `ImportProblem` with a list of
`(line, message)` in `.problems`; on success they return the number of rows imported.
`import_contractors` in `importers.py` is the example to follow.
''',
    "assets/__init__.py": "",
    "assets/db.py": '''import sqlite3

SCHEMA = """
CREATE TABLE contractors (id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL);
CREATE TABLE assets (
    id INTEGER PRIMARY KEY,
    tag TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    site TEXT NOT NULL,
    purchased_on TEXT NOT NULL
);
"""


def connect(path: str = ":memory:") -> sqlite3.Connection:
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    return connection


def create_schema(connection: sqlite3.Connection) -> None:
    connection.executescript(SCHEMA)
''',
    "assets/importers.py": '''import csv
import io
import sqlite3


class ImportProblem(Exception):
    """An import with invalid rows; `problems` lists (line, message)."""

    def __init__(self, problems: list[tuple[int, str]]):
        super().__init__(f"{len(problems)} problem(s) in the file")
        self.problems = problems


def import_contractors(connection: sqlite3.Connection, csv_text: str) -> int:
    rows = list(csv.DictReader(io.StringIO(csv_text)))
    problems = []
    for line, row in enumerate(rows, start=2):
        if not (row.get("code") or "").strip():
            problems.append((line, "code is missing"))
        if not (row.get("name") or "").strip():
            problems.append((line, "name is missing"))
    if problems:
        raise ImportProblem(problems)
    with connection:
        connection.executemany(
            "INSERT INTO contractors (code, name) VALUES (?, ?)",
            [(row["code"].strip(), row["name"].strip()) for row in rows],
        )
    return len(rows)
''',
    "tests/__init__.py": "",
    "tests/test_importers.py": '''import unittest

from assets.db import connect, create_schema
from assets.importers import ImportProblem, import_contractors


class ContractorImportTests(unittest.TestCase):
    def setUp(self):
        self.connection = connect()
        create_schema(self.connection)

    def test_a_valid_file_is_imported(self):
        self.assertEqual(import_contractors(self.connection, "code,name\\nNP,Northpoint\\nBR,Bright Rope\\n"), 2)

    def test_a_file_with_a_bad_row_imports_nothing(self):
        with self.assertRaises(ImportProblem) as raised:
            import_contractors(self.connection, "code,name\\nNP,Northpoint\\n,Bright Rope\\n")
        self.assertEqual(raised.exception.problems, [(3, "code is missing")])
        self.assertEqual(self.connection.execute("SELECT COUNT(*) FROM contractors").fetchone()[0], 0)
''',
  }})
hidden["D-asset-import"] = '''import unittest

from assets.db import connect, create_schema
from assets.importers import ImportProblem, import_assets

HEADER = "tag,name,site,purchased_on\\n"


def count(connection):
    return connection.execute("SELECT COUNT(*) FROM assets").fetchone()[0]


class HiddenAssetImportTests(unittest.TestCase):
    def setUp(self):
        self.connection = connect()
        create_schema(self.connection)

    def test_a_valid_file_is_imported(self):
        text = HEADER + "AC-001,Chiller pump,Tower A,2024-03-01\\nAC-002,Cooling tower fan,Tower B,2023-11-15\\n"
        self.assertEqual(import_assets(self.connection, text), 2)
        self.assertEqual(count(self.connection), 2)

    def test_an_invalid_date_imports_nothing_and_names_the_line(self):
        text = HEADER + "AC-001,Chiller pump,Tower A,2024-03-01\\nAC-002,Cooling tower fan,Tower B,15/11/2023\\n"
        with self.assertRaises(ImportProblem) as raised:
            import_assets(self.connection, text)
        self.assertIn(3, [line for line, _ in raised.exception.problems])
        self.assertEqual(count(self.connection), 0)

    def test_a_tag_repeated_in_the_file_imports_nothing(self):
        text = HEADER + "AC-001,Chiller pump,Tower A,2024-03-01\\nAC-001,Cooling tower fan,Tower B,2023-11-15\\n"
        with self.assertRaises(ImportProblem):
            import_assets(self.connection, text)
        self.assertEqual(count(self.connection), 0)

    def test_a_tag_already_in_the_register_imports_nothing(self):
        import_assets(self.connection, HEADER + "AC-001,Chiller pump,Tower A,2024-03-01\\n")
        text = HEADER + "AC-002,Cooling tower fan,Tower B,2023-11-15\\nAC-001,Chiller pump,Tower A,2024-03-01\\n"
        with self.assertRaises(ImportProblem):
            import_assets(self.connection, text)
        self.assertEqual(count(self.connection), 1)

    def test_every_problem_is_reported_at_once(self):
        text = HEADER + ",Chiller pump,Tower A,2024-03-01\\nAC-002,,Tower B,not-a-date\\n"
        with self.assertRaises(ImportProblem) as raised:
            import_assets(self.connection, text)
        self.assertEqual(sorted({line for line, _ in raised.exception.problems}), [2, 3])
        self.assertGreaterEqual(len(raised.exception.problems), 3)
'''

# ---------------------------------------------------------------- E: an algorithm that must scale
cases.append({"id": "E-find-duplicates", "max_turns": 60,
  "prompt": "add find_duplicates(contacts) to contacts.py. contacts are duplicates when they share an email (ignore case and spaces) or a phone number (digits only). contacts linked through any chain belong to one group. return the groups of contact ids.",
  "files": {
    "README.md": "# Contacts\n\nThe contractor contact book (about 20,000 contacts today, growing).\n\n" + README_TESTS,
    "contacts/__init__.py": "",
    "contacts/contacts.py": '''from dataclasses import dataclass


@dataclass(frozen=True)
class Contact:
    id: int
    name: str
    email: str
    phone: str


def normalise_phone(phone: str) -> str:
    return "".join(character for character in phone if character.isdigit())
''',
    "tests/__init__.py": "",
    "tests/test_contacts.py": '''import unittest

from contacts.contacts import normalise_phone


class PhoneTests(unittest.TestCase):
    def test_digits_only(self):
        self.assertEqual(normalise_phone("+65 9123-4567"), "6591234567")
''',
  }})
hidden["E-find-duplicates"] = '''import time
import unittest

from contacts.contacts import Contact, find_duplicates


def as_sets(groups):
    return sorted(sorted(group) for group in groups)


class HiddenDuplicateTests(unittest.TestCase):
    def test_email_ignores_case_and_spaces(self):
        contacts = [Contact(1, "Mei", "Mei@Example.com ", "1"), Contact(2, "Mei L", "mei@example.com", "2"), Contact(3, "Raj", "raj@example.com", "3")]
        self.assertEqual(as_sets(find_duplicates(contacts)), [[1, 2]])

    def test_phone_compares_digits_only(self):
        contacts = [Contact(1, "A", "a@x.com", "+65 9123 4567"), Contact(2, "B", "b@x.com", "6591234567")]
        self.assertEqual(as_sets(find_duplicates(contacts)), [[1, 2]])

    def test_a_chain_is_one_group(self):
        contacts = [Contact(1, "A", "a@x.com", "111"), Contact(2, "B", "a@x.com", "222"), Contact(3, "C", "c@x.com", "222"), Contact(4, "D", "d@x.com", "444")]
        self.assertEqual(as_sets(find_duplicates(contacts)), [[1, 2, 3]])

    def test_empty_email_or_phone_never_links_contacts(self):
        contacts = [Contact(1, "A", "", ""), Contact(2, "B", " ", ""), Contact(3, "C", "c@x.com", "")]
        self.assertEqual(as_sets(find_duplicates(contacts)), [])

    def test_twenty_thousand_contacts_take_well_under_two_seconds(self):
        contacts = [Contact(i, f"Person {i}", f"person{i}@example.com", f"+65 8{i:07d}") for i in range(20000)]
        contacts += [Contact(20000 + i, f"Copy {i}", f"PERSON{i}@example.com", f"9{i:07d}") for i in range(0, 20000, 10)]
        started = time.perf_counter()
        groups = find_duplicates(contacts)
        elapsed = time.perf_counter() - started
        self.assertEqual(len(groups), 2000)
        self.assertLess(elapsed, 2.0, f"took {elapsed:.1f} s")
'''

(HERE / "cases.json").write_text(json.dumps(cases, indent=1))
(HERE / "hidden").mkdir(exist_ok=True)
for case_id, text in hidden.items():
    (HERE / "hidden" / f"{case_id}.py").write_text(text)
print(len(cases), "cases")
