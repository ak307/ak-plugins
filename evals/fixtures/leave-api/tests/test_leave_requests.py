def create_staff(client, email: str, is_manager: bool = False) -> int:
    response = client.post(
        "/staff", json={"email": email, "full_name": "Test Person", "is_manager": is_manager}
    )
    assert response.status_code == 201
    return response.json()["id"]


def submit_leave(client, staff_id: int, start_date: str, end_date: str):
    return client.post(
        "/leave-requests",
        json={
            "staff_id": staff_id,
            "leave_type": "annual",
            "start_date": start_date,
            "end_date": end_date,
            "reason": "Family trip",
        },
    )


def test_submit_leave_starts_as_pending(client):
    staff_id = create_staff(client, "staff@example.com")

    response = submit_leave(client, staff_id, "2026-12-01", "2026-12-05")

    assert response.status_code == 201
    assert response.json()["status"] == "pending"


def test_end_date_before_start_date_is_rejected(client):
    staff_id = create_staff(client, "staff@example.com")

    response = submit_leave(client, staff_id, "2026-12-05", "2026-12-01")

    assert response.status_code == 422


def test_overlapping_leave_is_a_conflict(client):
    staff_id = create_staff(client, "staff@example.com")
    submit_leave(client, staff_id, "2026-12-01", "2026-12-05")

    response = submit_leave(client, staff_id, "2026-12-04", "2026-12-08")

    assert response.status_code == 409


def test_manager_can_approve_leave(client):
    staff_id = create_staff(client, "staff@example.com")
    manager_id = create_staff(client, "manager@example.com", is_manager=True)
    leave_request_id = submit_leave(client, staff_id, "2026-12-01", "2026-12-05").json()["id"]

    response = client.post(
        f"/leave-requests/{leave_request_id}/approve", json={"manager_id": manager_id}
    )

    assert response.status_code == 200
    assert response.json()["status"] == "approved"
    assert response.json()["reviewed_by_id"] == manager_id


def test_non_manager_cannot_approve_leave(client):
    staff_id = create_staff(client, "staff@example.com")
    colleague_id = create_staff(client, "colleague@example.com")
    leave_request_id = submit_leave(client, staff_id, "2026-12-01", "2026-12-05").json()["id"]

    response = client.post(
        f"/leave-requests/{leave_request_id}/approve", json={"manager_id": colleague_id}
    )

    assert response.status_code == 403


def test_reviewed_leave_cannot_be_reviewed_again(client):
    staff_id = create_staff(client, "staff@example.com")
    manager_id = create_staff(client, "manager@example.com", is_manager=True)
    leave_request_id = submit_leave(client, staff_id, "2026-12-01", "2026-12-05").json()["id"]
    client.post(f"/leave-requests/{leave_request_id}/reject", json={"manager_id": manager_id})

    response = client.post(
        f"/leave-requests/{leave_request_id}/approve", json={"manager_id": manager_id}
    )

    assert response.status_code == 409


def test_list_leave_only_returns_the_requested_staff(client):
    first_staff_id = create_staff(client, "first@example.com")
    second_staff_id = create_staff(client, "second@example.com")
    submit_leave(client, first_staff_id, "2026-12-01", "2026-12-05")
    submit_leave(client, second_staff_id, "2026-12-01", "2026-12-05")

    response = client.get("/leave-requests", params={"staff_id": first_staff_id})

    assert response.status_code == 200
    assert [item["staff_id"] for item in response.json()] == [first_staff_id]


def test_list_leave_for_unknown_staff_is_not_found(client):
    response = client.get("/leave-requests", params={"staff_id": 999})

    assert response.status_code == 404
