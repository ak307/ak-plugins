from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel

from app import database

app = FastAPI(title="Orders API")


class OrderIn(BaseModel):
    customer_name: str
    customer_type: str
    subtotal: float


def get_db():
    connection = database.get_connection()
    try:
        yield connection
    finally:
        connection.close()


@app.post("/orders")
def create_order(order: OrderIn, db=Depends(get_db)):
    # work out discount
    if order.customer_type == "regular":
        discount = 0
    elif order.customer_type == "member":
        discount = order.subtotal * 0.05
        if order.subtotal > 500:
            discount = order.subtotal * 0.08
    elif order.customer_type == "vip":
        discount = order.subtotal * 0.10
    else:
        raise HTTPException(status_code=400, detail="Unknown customer type")
    # work out delivery
    if order.customer_type == "vip":
        delivery_fee = 0
    elif order.subtotal - discount >= 150:
        delivery_fee = 0
    else:
        delivery_fee = 8.5
    total = round(order.subtotal - discount + delivery_fee, 2)
    discount = round(discount, 2)
    cursor = db.execute(
        "INSERT INTO orders (customer_name, customer_type, subtotal, discount, delivery_fee, total) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (order.customer_name, order.customer_type, order.subtotal, discount, delivery_fee, total),
    )
    db.commit()
    return {"id": cursor.lastrowid, "subtotal": order.subtotal, "discount": discount,
            "delivery_fee": delivery_fee, "total": total}


@app.put("/orders/{order_id}")
def update_order(order_id: int, order: OrderIn, db=Depends(get_db)):
    existing = db.execute("SELECT id FROM orders WHERE id = ?", (order_id,)).fetchone()
    if existing is None:
        raise HTTPException(status_code=404, detail="Order not found")
    # work out discount (same as create)
    if order.customer_type == "regular":
        discount = 0
    elif order.customer_type == "member":
        discount = order.subtotal * 0.05
        if order.subtotal > 500:
            discount = order.subtotal * 0.08
    elif order.customer_type == "vip":
        discount = order.subtotal * 0.10
    else:
        raise HTTPException(status_code=400, detail="Unknown customer type")
    if order.customer_type == "vip":
        delivery_fee = 0
    elif order.subtotal - discount >= 150:
        delivery_fee = 0
    else:
        delivery_fee = 8.5
    total = round(order.subtotal - discount + delivery_fee, 2)
    discount = round(discount, 2)
    db.execute(
        "UPDATE orders SET customer_name = ?, customer_type = ?, subtotal = ?, discount = ?, "
        "delivery_fee = ?, total = ? WHERE id = ?",
        (order.customer_name, order.customer_type, order.subtotal, discount, delivery_fee, total, order_id),
    )
    db.commit()
    return {"id": order_id, "subtotal": order.subtotal, "discount": discount,
            "delivery_fee": delivery_fee, "total": total}


@app.get("/orders")
def list_orders(customer: str = "", db=Depends(get_db)):
    rows = db.execute(
        f"SELECT * FROM orders WHERE customer_name LIKE '%{customer}%' ORDER BY id"
    ).fetchall()
    return [dict(row) for row in rows]
