import sqlite3

DATABASE_PATH = "orders.db"


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    return connection


def create_tables(connection: sqlite3.Connection) -> None:
    connection.execute(
        "CREATE TABLE IF NOT EXISTS orders ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, customer_name TEXT NOT NULL, customer_type TEXT NOT NULL, "
        "subtotal REAL NOT NULL, discount REAL NOT NULL, delivery_fee REAL NOT NULL, total REAL NOT NULL)"
    )
    connection.commit()
