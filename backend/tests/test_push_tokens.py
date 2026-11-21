TOKEN = "ExponentPushToken[abc123]"


def register(client, headers, token=TOKEN):
    return client.post("/push-tokens/", json={"token": token}, headers=headers)


def test_register_token(client, auth):
    res = register(client, auth)
    assert res.status_code == 200
    assert res.json()["token"] == TOKEN
    assert "id" in res.json()


def test_same_token_twice_is_noop(client, auth):
    first = register(client, auth).json()
    second = register(client, auth)
    assert second.status_code == 200
    assert second.json()["id"] == first["id"]
    # only one row exists: one delete works, the next one finds nothing
    assert client.delete(f"/push-tokens/{TOKEN}", headers=auth).status_code == 200
    assert client.delete(f"/push-tokens/{TOKEN}", headers=auth).status_code == 404


def test_token_owned_by_other_user_moves_to_current_user(client, auth, other_auth):
    first = register(client, auth).json()
    moved = register(client, other_auth)
    assert moved.status_code == 200
    assert moved.json()["id"] == first["id"]
    # the first user no longer owns it, the second user does
    assert client.delete(f"/push-tokens/{TOKEN}", headers=auth).status_code == 404
    assert client.delete(f"/push-tokens/{TOKEN}", headers=other_auth).status_code == 200


def test_delete_token(client, auth):
    register(client, auth)
    res = client.delete(f"/push-tokens/{TOKEN}", headers=auth)
    assert res.status_code == 200
    assert client.delete(f"/push-tokens/{TOKEN}", headers=auth).status_code == 404


def test_cannot_delete_someone_elses_token(client, auth, other_auth):
    register(client, auth)
    assert client.delete(f"/push-tokens/{TOKEN}", headers=other_auth).status_code == 404
    # still owned by the first user
    assert client.delete(f"/push-tokens/{TOKEN}", headers=auth).status_code == 200


def test_delete_missing_token_404(client, auth):
    res = client.delete("/push-tokens/does-not-exist", headers=auth)
    assert res.status_code == 404


def test_blank_token_rejected(client, auth):
    assert register(client, auth, token="").status_code == 422
    assert register(client, auth, token="   ").status_code == 422


def test_requires_login(client):
    assert client.post("/push-tokens/", json={"token": TOKEN}).status_code in (401, 403)
    assert client.delete(f"/push-tokens/{TOKEN}").status_code in (401, 403)