from datetime import datetime, timezone

from app.core import budget_alerts


def this_month():
    now = datetime.now(timezone.utc)
    return f"{now.year:04d}-{now.month:02d}"


def setup_budget(client, headers, limit=100):
    cat = client.post(
        "/categories/", json={"name": "Food", "type": "expense"}, headers=headers
    ).json()["id"]
    res = client.post(
        "/budgets/",
        json={"limit_amount": limit, "month": this_month(), "category_id": cat},
        headers=headers,
    )
    assert res.status_code == 200
    res = client.post(
        "/push-tokens/", json={"token": "ExponentPushToken[test123]"}, headers=headers
    )
    assert res.status_code in (200, 201)
    return cat


def spend(client, headers, cat, amount):
    res = client.post(
        "/transactions/",
        json={"amount": amount, "payment_mode": "Cash", "category_id": cat},
        headers=headers,
    )
    assert res.status_code == 200


def capture_pushes(monkeypatch):
    sent = []
    monkeypatch.setattr(
        budget_alerts,
        "send_push",
        lambda tokens, title, body: sent.append((tokens, title, body)),
    )
    return sent


def test_no_push_below_80_percent(client, auth, monkeypatch):
    sent = capture_pushes(monkeypatch)
    cat = setup_budget(client, auth)
    spend(client, auth, cat, 50)
    assert sent == []


def test_push_at_80_percent_only_once(client, auth, monkeypatch):
    sent = capture_pushes(monkeypatch)
    cat = setup_budget(client, auth)
    spend(client, auth, cat, 85)
    assert len(sent) == 1
    assert sent[0][0] == ["ExponentPushToken[test123]"]
    spend(client, auth, cat, 5)  # 90%, still same alert level
    assert len(sent) == 1


def test_push_at_100_percent_after_80(client, auth, monkeypatch):
    sent = capture_pushes(monkeypatch)
    cat = setup_budget(client, auth)
    spend(client, auth, cat, 85)
    spend(client, auth, cat, 20)
    assert len(sent) == 2
    assert sent[1][1] == "Budget limit reached"
    spend(client, auth, cat, 10)  # already alerted at 100
    assert len(sent) == 2


def test_no_push_without_budget(client, auth, monkeypatch):
    sent = capture_pushes(monkeypatch)
    cat = client.post(
        "/categories/", json={"name": "Misc", "type": "expense"}, headers=auth
    ).json()["id"]
    spend(client, auth, cat, 500)
    assert sent == []