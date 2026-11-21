import logging

import requests

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

logger = logging.getLogger(__name__)


def send_push(tokens: list[str], title: str, body: str) -> None:
    """Send a push notification through Expo. Never raises, so a failed
    push can't break saving a transaction."""
    if not tokens:
        return

    messages = [
        {"to": token, "title": title, "body": body, "sound": "default"}
        for token in tokens
    ]

    try:
        requests.post(
            EXPO_PUSH_URL,
            json=messages,
            headers={"Accept": "application/json"},
            timeout=5,
        )
    except requests.RequestException:
        logger.warning("Expo push request failed", exc_info=True)