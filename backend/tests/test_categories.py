def make_category(client, headers, name="Food", type_="expense"):
    res = client.post(
        "/categories/", json={"name": name, "type": type_}, headers=headers
    )
    assert res.status_code == 200
    return res.json()["id"]


def make_tx(client, headers, category_id, amount=100):
    res = client.post(
        "/transactions/",
        json={"amount": amount, "payment_mode": "Cash", "category_id": category_id},
        headers=headers,
    )
    assert res.status_code == 200


def test_create_and_list(client, auth):
    make_category(client, auth, "  Food  ")
    res = client.get("/categories/", headers=auth)
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["name"] == "Food"  # whitespace stripped
    assert res.json()[0]["type"] == "expense"


def test_blank_name_rejected(client, auth):
    res = client.post(
        "/categories/", json={"name": "   ", "type": "expense"}, headers=auth
    )
    assert res.status_code == 422


def test_invalid_type_rejected(client, auth):
    res = client.post(
        "/categories/", json={"name": "X", "type": "other"}, headers=auth
    )
    assert res.status_code == 422


def test_rename(client, auth):
    cat = make_category(client, auth)
    res = client.put(f"/categories/{cat}", json={"name": "Dining"}, headers=auth)
    assert res.status_code == 200
    assert res.json()["name"] == "Dining"
    assert res.json()["type"] == "expense"


def test_rename_blank_rejected(client, auth):
    cat = make_category(client, auth)
    res = client.put(f"/categories/{cat}", json={"name": "  "}, headers=auth)
    assert res.status_code == 422


def test_type_change_allowed_when_unused(client, auth):
    cat = make_category(client, auth)
    res = client.put(f"/categories/{cat}", json={"type": "income"}, headers=auth)
    assert res.status_code == 200
    assert res.json()["type"] == "income"


def test_type_change_blocked_with_transactions(client, auth):
    cat = make_category(client, auth)
    make_tx(client, auth, cat)
    res = client.put(f"/categories/{cat}", json={"type": "income"}, headers=auth)
    assert res.status_code == 400


def test_type_change_blocked_with_budgets(client, auth):
    cat = make_category(client, auth)
    client.post(
        "/budgets/",
        json={"limit_amount": 500, "month": "2026-11", "category_id": cat},
        headers=auth,
    )
    res = client.put(f"/categories/{cat}", json={"type": "income"}, headers=auth)
    assert res.status_code == 400


def test_rename_allowed_even_when_in_use(client, auth):
    cat = make_category(client, auth)
    make_tx(client, auth, cat)
    res = client.put(f"/categories/{cat}", json={"name": "Dining"}, headers=auth)
    assert res.status_code == 200


def test_delete_unused_category(client, auth):
    cat = make_category(client, auth)
    assert client.delete(f"/categories/{cat}", headers=auth).status_code == 200
    assert client.get("/categories/", headers=auth).json() == []


def test_delete_blocked_when_in_use(client, auth):
    cat = make_category(client, auth)
    make_tx(client, auth, cat)
    res = client.delete(f"/categories/{cat}", headers=auth)
    assert res.status_code == 400


def test_update_missing_category_404(client, auth):
    res = client.put("/categories/99999", json={"name": "X"}, headers=auth)
    assert res.status_code == 404


def test_users_cannot_touch_each_others_categories(client, auth, other_auth):
    cat = make_category(client, auth)
    assert client.get("/categories/", headers=other_auth).json() == []
    res = client.put(f"/categories/{cat}", json={"name": "Hacked"}, headers=other_auth)
    assert res.status_code == 404
    assert client.delete(f"/categories/{cat}", headers=other_auth).status_code == 404