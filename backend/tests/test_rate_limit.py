import pytest

from app.core.limiter import limiter


@pytest.fixture()
def limited_client(client):
    """Same client, but with the rate limiter switched back on."""
    limiter.reset()
    limiter.enabled = True
    yield client
    limiter.enabled = False
    limiter.reset()


def test_login_is_rate_limited(limited_client):
    payload = {"email": "nobody@example.com", "password": "wrongpassword"}
    for _ in range(10):
        res = limited_client.post("/auth/login", json=payload)
        assert res.status_code == 401
    res = limited_client.post("/auth/login", json=payload)
    assert res.status_code == 429


def test_signup_is_rate_limited(limited_client):
    for i in range(5):
        res = limited_client.post(
            "/auth/signup",
            json={
                "name": "Test User",
                "email": f"user{i}@example.com",
                "password": "password123",
            },
        )
        assert res.status_code != 429
    res = limited_client.post(
        "/auth/signup",
        json={
            "name": "Test User",
            "email": "user99@example.com",
            "password": "password123",
        },
    )
    assert res.status_code == 429