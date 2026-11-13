def make_category(client, headers, name="Food", type_="expense"):
    res = client.post(
        "/categories/", json={"name": name, "type": type_}, headers=headers
    )
    assert res.status_code == 200
    return res.json()["id"]


def make_budget(client, headers, category_id, month="2026-11", limit=1000):
    return client.post(
        "/budgets/",
        json={"limit_amount": limit, "month": month, "category_id": category_id},
        headers=headers,
    )


def test_create_and_list(client, auth):
    cat = make_category(client, auth)
    res = make_budget(client, auth, cat)
    assert res.status_code == 200
    assert res.json()["limit_amount"] == 1000
    assert res.json()["month"] == "2026-11"

    listed = client.get("/budgets/", headers=auth).json()
    assert len(listed) == 1


def test_duplicate_category_and_month_rejected(client, auth):
    cat = make_category(client, auth)
    assert make_budget(client, auth, cat).status_code == 200
    assert make_budget(client, auth, cat).status_code == 400


def test_same_category_different_month_allowed(client, auth):
    cat = make_category(client, auth)
    assert make_budget(client, auth, cat, "2026-11").status_code == 200
    assert make_budget(client, auth, cat, "2026-12").status_code == 200


def test_invalid_month_rejected(client, auth):
    cat = make_category(client, auth)
    assert make_budget(client, auth, cat, "2026-13").status_code == 422
    assert make_budget(client, auth, cat, "Nov 2026").status_code == 422


def test_limit_must_be_positive(client, auth):
    cat = make_category(client, auth)
    assert make_budget(client, auth, cat, limit=0).status_code == 422
    assert make_budget(client, auth, cat, limit=-50).status_code == 422


def test_cannot_budget_someone_elses_category(client, auth, other_auth):
    theirs = make_category(client, other_auth)
    res = make_budget(client, auth, theirs)
    assert res.status_code == 404


def test_update_limit(client, auth):
    cat = make_category(client, auth)
    budget = make_budget(client, auth, cat).json()
    res = client.put(
        f"/budgets/{budget['id']}", json={"limit_amount": 500}, headers=auth
    )
    assert res.status_code == 200
    assert res.json()["limit_amount"] == 500
    assert res.json()["month"] == "2026-11"


def test_update_rejects_bad_values(client, auth):
    cat = make_category(client, auth)
    budget = make_budget(client, auth, cat).json()
    res = client.put(f"/budgets/{budget['id']}", json={"limit_amount": -1}, headers=auth)
    assert res.status_code == 422
    res = client.put(f"/budgets/{budget['id']}", json={"month": "bad"}, headers=auth)
    assert res.status_code == 422


def test_update_missing_budget_404(client, auth):
    res = client.put("/budgets/99999", json={"limit_amount": 10}, headers=auth)
    assert res.status_code == 404


def test_delete_budget(client, auth):
    cat = make_category(client, auth)
    budget = make_budget(client, auth, cat).json()
    assert client.delete(f"/budgets/{budget['id']}", headers=auth).status_code == 200
    assert client.get("/budgets/", headers=auth).json() == []


def test_users_cannot_see_or_edit_each_others_budgets(client, auth, other_auth):
    cat = make_category(client, auth)
    budget = make_budget(client, auth, cat).json()
    assert client.get("/budgets/", headers=other_auth).json() == []
    res = client.put(
        f"/budgets/{budget['id']}", json={"limit_amount": 1}, headers=other_auth
    )
    assert res.status_code == 404
    assert client.delete(f"/budgets/{budget['id']}", headers=other_auth).status_code == 404