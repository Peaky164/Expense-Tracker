def make_category(client, headers, name="Food", type_="expense"):
    res = client.post(
        "/categories/", json={"name": name, "type": type_}, headers=headers
    )
    assert res.status_code == 200
    return res.json()["id"]


def make_tx(client, headers, category_id, amount=100, description=None):
    res = client.post(
        "/transactions/",
        json={
            "amount": amount,
            "description": description,
            "payment_mode": "Cash",
            "category_id": category_id,
        },
        headers=headers,
    )
    assert res.status_code == 200
    return res.json()


def test_create_and_list(client, auth):
    cat = make_category(client, auth)
    make_tx(client, auth, cat, 250, "Lunch")
    res = client.get("/transactions/", headers=auth)
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["description"] == "Lunch"


def test_amount_must_be_positive(client, auth):
    cat = make_category(client, auth)
    res = client.post(
        "/transactions/",
        json={"amount": -5, "category_id": cat},
        headers=auth,
    )
    assert res.status_code == 422


def test_update_changes_only_sent_fields(client, auth):
    cat = make_category(client, auth)
    tx = make_tx(client, auth, cat, 100, "Lunch")
    res = client.put(f"/transactions/{tx['id']}", json={"amount": 250}, headers=auth)
    assert res.status_code == 200
    assert res.json()["amount"] == 250
    assert res.json()["description"] == "Lunch"
    assert res.json()["category_id"] == cat


def test_update_rejects_negative_amount(client, auth):
    cat = make_category(client, auth)
    tx = make_tx(client, auth, cat)
    res = client.put(f"/transactions/{tx['id']}", json={"amount": -5}, headers=auth)
    assert res.status_code == 422


def test_update_missing_transaction_404(client, auth):
    res = client.put("/transactions/99999", json={"amount": 10}, headers=auth)
    assert res.status_code == 404


def test_cannot_move_transaction_to_someone_elses_category(client, auth, other_auth):
    mine = make_category(client, auth, "Mine")
    theirs = make_category(client, other_auth, "Theirs")
    tx = make_tx(client, auth, mine)
    res = client.put(
        f"/transactions/{tx['id']}", json={"category_id": theirs}, headers=auth
    )
    assert res.status_code == 404


def test_users_cannot_see_or_edit_each_others_data(client, auth, other_auth):
    cat = make_category(client, auth)
    tx = make_tx(client, auth, cat)
    assert client.get("/transactions/", headers=other_auth).json() == []
    res = client.put(
        f"/transactions/{tx['id']}", json={"amount": 1}, headers=other_auth
    )
    assert res.status_code == 404
    res = client.delete(f"/transactions/{tx['id']}", headers=other_auth)
    assert res.status_code == 404


def test_pagination_newest_first(client, auth):
    cat = make_category(client, auth)
    for i in range(5):
        make_tx(client, auth, cat, 10 + i, f"t{i}")

    page1 = client.get("/transactions/?skip=0&limit=2", headers=auth).json()
    assert [t["description"] for t in page1] == ["t4", "t3"]

    page2 = client.get("/transactions/?skip=2&limit=2", headers=auth).json()
    assert [t["description"] for t in page2] == ["t2", "t1"]


def test_limit_is_capped(client, auth):
    res = client.get("/transactions/?limit=500", headers=auth)
    assert res.status_code == 422


def test_delete_transaction(client, auth):
    cat = make_category(client, auth)
    tx = make_tx(client, auth, cat)
    assert client.delete(f"/transactions/{tx['id']}", headers=auth).status_code == 200
    assert client.get("/transactions/", headers=auth).json() == []