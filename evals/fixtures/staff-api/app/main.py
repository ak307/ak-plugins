from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from app import database
from app.config import PAYROLL_API_KEY

app = FastAPI(title="Staff API")


@app.exception_handler(Exception)
async def handle_unexpected_error(request: Request, error: Exception):
    return JSONResponse(status_code=500, content={"detail": f"{type(error).__name__}: {error}"})


def get_db():
    connection = database.get_connection()
    try:
        yield connection
    finally:
        connection.close()


def get_current_staff(authorization: str = Header(default=""), db=Depends(get_db)) -> dict:
    token = authorization.removeprefix("Bearer ").strip()
    staff = database.find_staff_by_token(db, token) if token else None
    if staff is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return staff


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/staff/search")
def search_staff(name: str, db=Depends(get_db), current_staff: dict = Depends(get_current_staff)):
    return database.search_staff_by_name(db, name)


@app.get("/staff/{staff_id}/salary")
def get_salary(staff_id: int, db=Depends(get_db)):
    staff = database.get_staff(db, staff_id)
    if staff is None:
        raise HTTPException(status_code=404, detail="Staff not found")
    return {"staff_id": staff_id, "salary": staff["salary"]}


@app.get("/payroll/export")
def payroll_export(x_api_key: str = Header(default=""), db=Depends(get_db)):
    if x_api_key != PAYROLL_API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")
    rows = db.execute("SELECT id, name, salary FROM staff ORDER BY id").fetchall()
    return [dict(row) for row in rows]
