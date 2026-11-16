from datetime import datetime

from app.models.category import Category
from app.models.transaction import Transaction


def _user_id(client, headers):
    return client.get("/auth/me", headers=headers).json()["id"]


def _add_category(db, owner_id, name="Food"):
    cat = Category(name=name, type="expense", owner_id=owner_id)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat.id


def _add_tx(db, owner_id, category_id, amount, date):
    db.add(
        Transaction(
            amount=amount, date=date, owner_id=owner_id, category_id=category_id
        )
    )
    db.commit()


def _add_budget(client, headers, category_id, limit, month="2026-11"):
    res = client.post(
        "/budgets/",
        json={"limit_amount": limit, "month": month, "category_id": category_id},
        headers=headers,
    )
    assert res.status_code == 200
    return res.json()["id"]


def test_progress_values_and_month_boundaries(client, auth, db_session):
    uid = _user_id(client, auth)
    cat = _add_category(db_session, uid)
    budget_id = _add_budget(client, auth, cat, 1000)

    _add_tx(db_session, uid, cat, 300, datetime(2026, 11, 5))
    _add_tx(db_session, uid, cat, 200, datetime(2026, 11, 30, 23, 59))
    _add_tx(db_session, uid, cat, 999, datetime(2026, 10, 31, 23, 59))  # October
    _add_tx(db_session, uid, cat, 50, datetime(2026, 12, 1, 0, 0))  # December

    res = client.get("/budgets/progress?month=2026-11", headers=auth)
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 1
    assert body[0]["budget_id"] == budget_id
    assert body[0]["category_name"] == "Food"
    assert body[0]["spent"] == 500
    assert body[0]["remaining"] == 500
    assert body[0]["percent_used"] == 50.0


def test_progress_zero_spent(client, auth, db_session):
    uid = _user_id(client, auth)
    cat = _add_category(db_session, uid)
    _add_budget(client, auth, cat, 400)

    body = client.get("/budgets/progress?month=2026-11", headers=auth).json()
    assert body[0]["spent"] == 0
    assert body[0]["remaining"] == 400
    assert body[0]["percent_used"] == 0


def test_progress_over_budget(client, auth, db_session):
    uid = _user_id(client, auth)
    cat = _add_category(db_session, uid)
    _add_budget(client, auth, cat, 100)
    _add_tx(db_session, uid, cat, 150, datetime(2026, 11, 10))

    body = client.get("/budgets/progress?month=2026-11", headers=auth).json()
    assert body[0]["remaining"] == -50
    assert body[0]["percent_used"] == 150.0


def test_progress_ignores_other_users(client, auth, other_auth, db_session):
    uid = _user_id(client, auth)
    other_uid = _user_id(client, other_auth)
    cat = _add_category(db_session, uid)
    other_cat = _add_category(db_session, other_uid, name="Rent")
    _add_budget(client, auth, cat, 1000)
    _add_budget(client, other_auth, other_cat, 5000)

    _add_tx(db_session, uid, cat, 100, datetime(2026, 11, 5))
    # another user's transaction, even if pointed at my category, must not count
    _add_tx(db_session, other_uid, cat, 777, datetime(2026, 11, 5))
    _add_tx(db_session, other_uid, other_cat, 4000, datetime(2026, 11, 5))

    mine = client.get("/budgets/progress?month=2026-11", headers=auth).json()
    assert len(mine) == 1
    assert mine[0]["category_name"] == "Food"
    assert mine[0]["spent"] == 100

    theirs = client.get("/budgets/progress?month=2026-11", headers=other_auth).json()
    assert len(theirs) == 1
    assert theirs[0]["category_name"] == "Rent"
    assert theirs[0]["spent"] == 4000


def test_progress_rejects_bad_month(client, auth):
    assert client.get("/budgets/progress?month=2026-13", headers=auth).status_code == 422
    assert client.get("/budgets/progress", headers=auth).status_code == 422


def test_progress_requires_login(client):
    res = client.get("/budgets/progress?month=2026-11")
    assert res.status_code in (401, 403)