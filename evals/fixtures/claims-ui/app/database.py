import os
import sqlite3
from pathlib import Path


def read_env_file() -> dict[str, str]:
    """Read KEY=value lines from the project's .env file."""
    values = {}
    env_file = Path(__file__).resolve().parent.parent / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                key, value = line.split("=", 1)
                values[key.strip()] = value.strip()
    return values


DATABASE_PATH = os.environ.get("DATABASE_PATH") or read_env_file().get("DATABASE_PATH", "approvals.db")


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    return connection


def create_tables(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS expense_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            staff_name TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL,
            history TEXT NOT NULL DEFAULT ''
        )
        """
    )
    connection.commit()
