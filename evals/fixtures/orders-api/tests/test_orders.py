def order(customer_type, subtotal, name="Ann"):
    return {"customer_name": name, "customer_type": customer_type, "subtotal": subtotal}


def test_regular_small_order_pays_delivery(client):
    body = client.post("/orders", json=order("regular", 100)).json()
    assert (body["discount"], body["delivery_fee"], body["total"]) == (0, 8.5, 108.5)


def test_member_discount(client):
    body = client.post("/orders", json=order("member", 200)).json()
    assert (body["discount"], body["delivery_fee"], body["total"]) == (10.0, 0, 190.0)


def test_vip_free_delivery(client):
    body = client.post("/orders", json=order("vip", 50)).json()
    assert (body["discount"], body["delivery_fee"], body["total"]) == (5.0, 0, 45.0)


def test_unknown_type_rejected(client):
    assert client.post("/orders", json=order("gold", 50)).status_code == 400


def test_update_recalculates(client):
    order_id = client.post("/orders", json=order("regular", 100)).json()["id"]
    body = client.put(f"/orders/{order_id}", json=order("vip", 100)).json()
    assert (body["discount"], body["delivery_fee"], body["total"]) == (10.0, 0, 90.0)


def test_list_filters_by_customer(client):
    client.post("/orders", json=order("regular", 10, name="Ann"))
    client.post("/orders", json=order("regular", 10, name="Bob"))
    assert [row["customer_name"] for row in client.get("/orders", params={"customer": "Bo"}).json()] == ["Bob"]
