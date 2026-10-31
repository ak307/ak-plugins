"""Expense claim approval.

Workflow: draft -> submitted (staff) -> manager_approved (manager)
-> finance_approved (finance, amounts up to 5000)
   or pending_director (finance, amounts over 5000) -> director_approved (director).
Any approver can reject.
"""
import sqlite3

from fastapi import Depends, FastAPI, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel

from app import database

app = FastAPI(title="Expense approvals")

DIRECTOR_LIMIT = 5000

STATUS_LABELS = {
    "draft": "Draft",
    "submitted": "Waiting for manager approval",
    "manager_approved": "Waiting for finance approval",
    "approved_by_finance": "Approved",
    "pending_director": "Waiting for director approval",
    "approved_by_director": "Approved",
    "rejected": "Rejected",
}


class ExpenseIn(BaseModel):
    staff_name: str
    description: str
    amount: float


def get_db():
    connection = database.get_connection()
    database.create_tables(connection)
    try:
        yield connection
    finally:
        connection.close()


def load_request(connection: sqlite3.Connection, request_id: int) -> sqlite3.Row:
    row = connection.execute("SELECT * FROM expense_requests WHERE id = ?", (request_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Expense request not found")
    return row


def set_status(connection: sqlite3.Connection, request_id: int, status: str, note: str) -> None:
    row = load_request(connection, request_id)
    history = row["history"] + note + ";"
    connection.execute(
        "UPDATE expense_requests SET status = ?, history = ? WHERE id = ?", (status, history, request_id)
    )
    connection.commit()


@app.post("/expenses", status_code=201)
def create_expense(expense: ExpenseIn, connection: sqlite3.Connection = Depends(get_db)):
    cursor = connection.execute(
        "INSERT INTO expense_requests (staff_name, description, amount, status) VALUES (?, ?, ?, 'draft')",
        (expense.staff_name, expense.description, expense.amount),
    )
    connection.commit()
    return {"id": cursor.lastrowid, "status": "draft"}


@app.post("/expenses/{request_id}/submit")
def submit(request_id: int, connection: sqlite3.Connection = Depends(get_db)):
    row = load_request(connection, request_id)
    if row["status"] != "draft":
        raise HTTPException(status_code=409, detail="Only drafts can be submitted")
    set_status(connection, request_id, "submitted", "submitted")
    return {"status": "submitted"}


@app.post("/expenses/{request_id}/manager-approve")
def manager_approve(request_id: int, connection: sqlite3.Connection = Depends(get_db)):
    load_request(connection, request_id)
    set_status(connection, request_id, "manager_approved", "manager approved")
    return {"status": "manager_approved"}


@app.post("/expenses/{request_id}/finance-approve")
def finance_approve(request_id: int, connection: sqlite3.Connection = Depends(get_db)):
    row = load_request(connection, request_id)
    if row["status"] != "manager_approved":
        raise HTTPException(status_code=409, detail="Waiting for manager approval")
    if row["amount"] > DIRECTOR_LIMIT:
        set_status(connection, request_id, "pending_director", "finance approved, sent to director")
        return {"status": "pending_director"}
    set_status(connection, request_id, "finance_approved", "finance approved")
    return {"status": "finance_approved"}


@app.post("/expenses/{request_id}/director-approve")
def director_approve(request_id: int, connection: sqlite3.Connection = Depends(get_db)):
    row = load_request(connection, request_id)
    if row["status"] != "pending_director":
        raise HTTPException(status_code=409, detail="Not waiting for director approval")
    set_status(connection, request_id, "director_approved", "director approved")
    return {"status": "director_approved"}


@app.post("/expenses/{request_id}/reject")
def reject(request_id: int, connection: sqlite3.Connection = Depends(get_db)):
    load_request(connection, request_id)
    set_status(connection, request_id, "rejected", "rejected")
    return {"status": "rejected"}


@app.get("/expenses/{request_id}/status")
def status_page(request_id: int, connection: sqlite3.Connection = Depends(get_db)):
    row = load_request(connection, request_id)
    status = row["status"]
    if status == "manager_approved" and row["amount"] >= DIRECTOR_LIMIT:
        next_approver = "director"
    elif status in ("submitted",):
        next_approver = "manager"
    elif status == "manager_approved":
        next_approver = "finance"
    elif status == "pending_director":
        next_approver = "director"
    else:
        next_approver = None
    return {
        "id": row["id"],
        "status": status,
        "label": STATUS_LABELS.get(status, "Waiting for finance approval"),
        "next_approver": next_approver,
    }


@app.get("/reports/approved-total")
def approved_total(connection: sqlite3.Connection = Depends(get_db)):
    row = connection.execute(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM expense_requests "
        "WHERE status IN ('approved_by_finance', 'approved_by_director')"
    ).fetchone()
    return {"approved_total": row["total"]}


@app.get("/", response_class=HTMLResponse)
def claim_form_page():
    return """<!doctype html><html><head><title>New claim</title></head><body>
<h1>New expense claim</h1>
<form method="post" action="/claims/new">
<label>Name <input name="staff_name"></label><br>
<label>Description <input name="description"></label><br>
<label>Amount <input name="amount" type="number" step="0.01"></label><br>
<button type="submit">Submit claim</button>
</form></body></html>"""


@app.post("/claims/new")
def submit_claim_form(staff_name: str = Form(...), description: str = Form(...), amount: float = Form(...),
                      connection: sqlite3.Connection = Depends(get_db)):
    connection.execute(
        "INSERT INTO expense_requests (staff_name, description, amount, status) VALUES (?, ?, ?, 'submitted')",
        (staff_name, description, amount),
    )
    connection.commit()
    return RedirectResponse("/", status_code=303)
