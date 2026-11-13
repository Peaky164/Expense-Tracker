from datetime import datetime, timezone

from app.models.transaction import Transaction


def make_category(client, headers, name, type_):
    res = client.post(
        "/categories/", json={"name": name, "type": type_}, headers=headers
    )
    assert res.status_code == 200
    return res.json()["id"]


def user_id(client, headers):
    return client.get("/auth/me", headers=headers).json()["id"]


def add_tx(db, owner_id, category_id, amount, when):
    db.add(
        Transaction(
            amount=amount,
            description=None,
            date=when,
            payment_mode="Cash",
            owner_id=owner_id,
            category_id=category_id,
        )
    )
    db.commit()


def utc(y, m, d, h=0, mi=0, s=0):
    return datetime(y, m, d, h, mi, s, tzinfo=timezone.utc)


def test_requires_auth(client):
    res = client.get("/dashboard/summary?month=2026-11")
    assert res.status_code in (401, 403)


def test_empty_month_returns_zeros(client, auth):
    res = client.get("/dashboard/summary?month=2020-01", headers=auth)
    assert res.status_code == 200
    body = res.json()
    assert body["month"] == "2020-01"
    assert body["total_income"] == 0
    assert body["total_expense"] == 0
    assert body["balance"] == 0
    assert body["transaction_count"] == 0
    assert body["by_category"] == []


def test_invalid_month_rejected(client, auth):
    assert client.get("/dashboard/summary?month=2026-13", headers=auth).status_code == 422
    assert client.get("/dashboard/summary?month=abc", headers=auth).status_code == 422
    assert client.get("/dashboard/summary", headers=auth).status_code == 422


def test_totals_breakdown_and_month_boundaries(client, auth, db_session):
    uid = user_id(client, auth)
    salary = make_category(client, auth, "Salary", "income")
    food = make_category(client, auth, "Food", "expense")
    rent = make_category(client, auth, "Rent", "expense")

    # Inside November 2026 (includes first and last second of the month)
    add_tx(db_session, uid, salary, 1000, utc(2026, 11, 5))
    add_tx(db_session, uid, food, 200, utc(2026, 11, 10))
    add_tx(db_session, uid, food, 100, utc(2026, 11, 30, 23, 59, 59))
    add_tx(db_session, uid, rent, 350, utc(2026, 11, 1, 0, 0, 0))
    # Outside the month: must be ignored
    add_tx(db_session, uid, food, 999, utc(2026, 10, 31, 23, 59, 59))
    add_tx(db_session, uid, food, 888, utc(2026, 12, 1, 0, 0, 0))

    res = client.get("/dashboard/summary?month=2026-11", headers=auth)
    assert res.status_code == 200
    body = res.json()
    assert body["total_income"] == 1000
    assert body["total_expense"] == 650
    assert body["balance"] == 350
    assert body["transaction_count"] == 4

    # expense categories only, biggest first
    assert [c["name"] for c in body["by_category"]] == ["Rent", "Food"]
    assert [c["total"] for c in body["by_category"]] == [350, 300]


def test_december_rolls_over_to_next_year(client, auth, db_session):
    uid = user_id(client, auth)
    food = make_category(client, auth, "Food", "expense")
    add_tx(db_session, uid, food, 40, utc(2026, 12, 31, 23, 59, 59))
    add_tx(db_session, uid, food, 70, utc(2027, 1, 1))

    body = client.get("/dashboard/summary?month=2026-12", headers=auth).json()
    assert body["total_expense"] == 40
    assert body["transaction_count"] == 1


def test_other_users_data_excluded(client, auth, other_auth, db_session):
    other_id = user_id(client, other_auth)
    theirs = make_category(client, other_auth, "Food", "expense")
    add_tx(db_session, other_id, theirs, 500, utc(2026, 11, 10))

    body = client.get("/dashboard/summary?month=2026-11", headers=auth).json()
    assert body["total_expense"] == 0
    assert body["transaction_count"] == 0