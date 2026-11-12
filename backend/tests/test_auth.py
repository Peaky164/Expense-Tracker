def test_signup_and_login(client):
    res = client.post(
        "/auth/signup",
        json={"name": "Sam", "email": "sam@example.com", "password": "password123"},
    )
    assert res.status_code == 200
    assert res.json()["email"] == "sam@example.com"

    res = client.post(
        "/auth/login", json={"email": "sam@example.com", "password": "password123"}
    )
    assert res.status_code == 200
    assert res.json()["token_type"] == "bearer"


def test_duplicate_email_rejected(client):
    body = {"name": "Sam", "email": "sam@example.com", "password": "password123"}
    client.post("/auth/signup", json=body)
    res = client.post("/auth/signup", json=body)
    assert res.status_code == 400


def test_wrong_password_rejected(client):
    client.post(
        "/auth/signup",
        json={"name": "Sam", "email": "sam@example.com", "password": "password123"},
    )
    res = client.post(
        "/auth/login", json={"email": "sam@example.com", "password": "wrongpass1"}
    )
    assert res.status_code == 401


def test_short_password_rejected(client):
    res = client.post(
        "/auth/signup",
        json={"name": "Sam", "email": "sam@example.com", "password": "short"},
    )
    assert res.status_code == 422


def test_me_requires_token(client):
    res = client.get("/auth/me")
    assert res.status_code in (401, 403)


def test_me_returns_user(client, auth):
    res = client.get("/auth/me", headers=auth)
    assert res.status_code == 200
    assert res.json()["email"] == "user1@example.com"