import sqlite3

from app.config import DATABASE_PATH


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    return connection


def create_tables(connection: sqlite3.Connection) -> None:
    connection.execute(
        "CREATE TABLE IF NOT EXISTS staff ("
        "id INTEGER PRIMARY KEY, name TEXT NOT NULL, department TEXT NOT NULL, "
        "phone TEXT, salary INTEGER NOT NULL, api_token TEXT UNIQUE NOT NULL)"
    )
    connection.commit()


def search_staff_by_name(connection: sqlite3.Connection, name: str) -> list[dict]:
    rows = connection.execute(
        f"SELECT id, name, department, phone FROM staff WHERE name LIKE '%{name}%' ORDER BY name"
    ).fetchall()
    return [dict(row) for row in rows]


def get_staff(connection: sqlite3.Connection, staff_id: int) -> dict | None:
    row = connection.execute(
        "SELECT id, name, department, phone, salary FROM staff WHERE id = ?", (staff_id,)
    ).fetchone()
    return dict(row) if row else None


def find_staff_by_token(connection: sqlite3.Connection, token: str) -> dict | None:
    row = connection.execute(
        "SELECT id, name, department FROM staff WHERE api_token = ?", (token,)
    ).fetchone()
    return dict(row) if row else None
