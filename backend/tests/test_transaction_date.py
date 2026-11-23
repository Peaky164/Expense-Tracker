from datetime import datetime, timezone

from app.core import budget_alerts


def make_category(client, headers):
    res = client.post(
        "/categories/", json={"name": "Food", "type": "expense"}, headers=headers
    )
    assert res.status_code == 200
    return res.json()["id"]


def post_tx(client, headers, cat, **extra):
    body = {"amount": 100, "payment_mode": "Cash", "category_id": cat, **extra}
    return client.post("/transactions/", json=body, headers=headers)


def test_date_defaults_to_now_when_not_sent(client, auth):
    cat = make_category(client, auth)
    res = post_tx(client, auth, cat)
    assert res.status_code == 200
    assert res.json()["date"].startswith(str(datetime.now(timezone.utc).year))


def test_explicit_date_is_saved(client, auth):
    cat = make_category(client, auth)
    res = post_tx(client, auth, cat, date="2020-01-15T10:00:00")
    assert res.status_code == 200
    assert res.json()["date"].startswith("2020-01-15T10:00")


def test_date_with_offset_is_converted_to_utc(client, auth):
    cat = make_category(client, auth)
    res = post_tx(client, auth, cat, date="2026-11-19T01:00:00+05:30")
    assert res.status_code == 200
    assert res.json()["date"].startswith("2026-11-18T19:30")


def test_invalid_date_is_rejected(client, auth):
    cat = make_category(client, auth)
    res = post_tx(client, auth, cat, date="not-a-date")
    assert res.status_code == 422


def test_old_dated_transaction_does_not_alert_this_months_budget(
    client, auth, monkeypatch
):
    sent = []
    monkeypatch.setattr(
        budget_alerts, "send_push", lambda tokens, title, body: sent.append(title)
    )
    cat = make_category(client, auth)
    now = datetime.now(timezone.utc)
    month = f"{now.year:04d}-{now.month:02d}"
    res = client.post(
        "/budgets/",
        json={"limit_amount": 100, "month": month, "category_id": cat},
        headers=auth,
    )
    assert res.status_code == 200
    client.post(
        "/push-tokens/", json={"token": "ExponentPushToken[test123]"}, headers=auth
    )

    # 500 spent, but dated years ago, so this month's budget is untouched
    res = post_tx(client, auth, cat, amount=500, date="2020-01-15T10:00:00")
    assert res.status_code == 200
    assert sent == []