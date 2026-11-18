import pytest

from app.core.google import GoogleTokenError
from app.models.user import User


def fake_google(monkeypatch, info):
    """Make /auth/google see `info` as the verified Google token payload."""

    def _verify(token):
        return info

    monkeypatch.setattr("app.routers.auth.verify_google_token", _verify)


def google_info(**overrides):
    info = {
        "sub": "google-sub-1",
        "email": "gina@example.com",
        "email_verified": True,
        "name": "Gina Google",
    }
    info.update(overrides)
    return info


def post_google(client, token="fake-token"):
    return client.post("/auth/google", json={"id_token": token})


def test_first_google_login_creates_account(client, db_session, monkeypatch):
    fake_google(monkeypatch, google_info())

    res = post_google(client)
    assert res.status_code == 200
    body = res.json()
    assert body["token_type"] == "bearer"

    me = client.get(
        "/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"}
    )
    assert me.status_code == 200
    assert me.json()["email"] == "gina@example.com"

    db_session.expire_all()
    user = db_session.query(User).filter(User.email == "gina@example.com").one()
    assert user.google_sub == "google-sub-1"
    assert user.hashed_password is None
    assert user.name == "Gina Google"


def test_returning_google_login_does_not_duplicate(client, db_session, monkeypatch):
    fake_google(monkeypatch, google_info())

    assert post_google(client).status_code == 200
    assert post_google(client).status_code == 200

    db_session.expire_all()
    assert db_session.query(User).count() == 1


def test_google_login_links_existing_password_account(client, db_session, monkeypatch):
    client.post(
        "/auth/signup",
        json={"name": "Gina", "email": "gina@example.com", "password": "password123"},
    )
    fake_google(monkeypatch, google_info())

    assert post_google(client).status_code == 200

    db_session.expire_all()
    users = db_session.query(User).all()
    assert len(users) == 1
    assert users[0].google_sub == "google-sub-1"
    assert users[0].hashed_password is not None

    # The password still works after linking.
    res = client.post(
        "/auth/login", json={"email": "gina@example.com", "password": "password123"}
    )
    assert res.status_code == 200


def test_google_email_is_normalized(client, db_session, monkeypatch):
    fake_google(monkeypatch, google_info(email="  Gina@Example.COM "))

    assert post_google(client).status_code == 200

    db_session.expire_all()
    assert db_session.query(User).one().email == "gina@example.com"


def test_unverified_google_email_rejected(client, db_session, monkeypatch):
    fake_google(monkeypatch, google_info(email_verified=False))

    res = post_google(client)
    assert res.status_code == 401

    db_session.expire_all()
    assert db_session.query(User).count() == 0


def test_unverified_email_cannot_take_over_existing_account(
    client, db_session, monkeypatch
):
    client.post(
        "/auth/signup",
        json={"name": "Gina", "email": "gina@example.com", "password": "password123"},
    )
    fake_google(monkeypatch, google_info(email_verified=False))

    assert post_google(client).status_code == 401

    db_session.expire_all()
    assert db_session.query(User).one().google_sub is None


def test_token_missing_sub_rejected(client, monkeypatch):
    fake_google(monkeypatch, google_info(sub=None))

    assert post_google(client).status_code == 401


def test_invalid_google_token_rejected(client, monkeypatch):
    def _verify(token):
        raise GoogleTokenError("bad token")

    monkeypatch.setattr("app.routers.auth.verify_google_token", _verify)

    assert post_google(client).status_code == 401


def test_garbage_token_rejected_by_real_verifier(client, monkeypatch):
    # No fake verifier here: the real one rejects a malformed token
    # before any network call is made. Set the client ID explicitly
    # so this test does not depend on other tests or on conftest.
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-google-client-id")

    assert post_google(client, token="not-a-jwt").status_code == 401


def test_google_not_configured_returns_503(client, monkeypatch):
    monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)

    assert post_google(client).status_code == 503


def test_password_login_for_google_only_account_returns_401(client, monkeypatch):
    fake_google(monkeypatch, google_info())
    assert post_google(client).status_code == 200

    res = client.post(
        "/auth/login", json={"email": "gina@example.com", "password": "password123"}
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Invalid email or password"


def test_signup_with_google_email_rejected(client, monkeypatch):
    fake_google(monkeypatch, google_info())
    assert post_google(client).status_code == 200

    res = client.post(
        "/auth/signup",
        json={"name": "Gina", "email": "gina@example.com", "password": "password123"},
    )
    assert res.status_code == 400