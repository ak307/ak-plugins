def new_expense(client, amount=120.0):
    response = client.post("/expenses", json={"staff_name": "Mei", "description": "Taxi", "amount": amount})
    return response.json()["id"]


def test_create_is_draft(client):
    request_id = new_expense(client)
    assert client.get(f"/expenses/{request_id}/status").json()["label"] == "Draft"


def test_submit_waits_for_manager(client):
    request_id = new_expense(client)
    client.post(f"/expenses/{request_id}/submit")
    body = client.get(f"/expenses/{request_id}/status").json()
    assert (body["label"], body["next_approver"]) == ("Waiting for manager approval", "manager")


def test_cannot_submit_twice(client):
    request_id = new_expense(client)
    client.post(f"/expenses/{request_id}/submit")
    assert client.post(f"/expenses/{request_id}/submit").status_code == 409


def test_manager_approval_waits_for_finance(client):
    request_id = new_expense(client)
    client.post(f"/expenses/{request_id}/submit")
    client.post(f"/expenses/{request_id}/manager-approve")
    assert client.get(f"/expenses/{request_id}/status").json()["label"] == "Waiting for finance approval"


def test_large_claim_goes_to_director(client):
    request_id = new_expense(client, amount=8000)
    client.post(f"/expenses/{request_id}/submit")
    client.post(f"/expenses/{request_id}/manager-approve")
    assert client.post(f"/expenses/{request_id}/finance-approve").json()["status"] == "pending_director"


def test_reject_while_waiting(client):
    request_id = new_expense(client)
    client.post(f"/expenses/{request_id}/submit")
    client.post(f"/expenses/{request_id}/reject")
    assert client.get(f"/expenses/{request_id}/status").json()["label"] == "Rejected"
