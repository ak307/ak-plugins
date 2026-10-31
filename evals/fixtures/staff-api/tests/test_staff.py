from app.config import PAYROLL_API_KEY

AUNG = {"Authorization": "Bearer token-aung"}


def test_search_finds_by_partial_name(client):
    response = client.get("/staff/search", params={"name": "Lin"}, headers=AUNG)
    assert response.status_code == 200
    assert [staff["name"] for staff in response.json()] == ["Mei Lin"]


def test_search_requires_login(client):
    assert client.get("/staff/search", params={"name": "a"}).status_code == 401


def test_salary_is_returned(client):
    response = client.get("/staff/2/salary")
    assert response.status_code == 200
    assert response.json() == {"staff_id": 2, "salary": 6100}


def test_payroll_export_with_key(client):
    response = client.get("/payroll/export", headers={"X-API-Key": PAYROLL_API_KEY})
    assert response.status_code == 200
    assert len(response.json()) == 3
