import os

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

_request = google_requests.Request()


class GoogleNotConfigured(Exception):
    """GOOGLE_CLIENT_ID is not set on the server."""


class GoogleTokenError(Exception):
    """The Google ID token is invalid, expired, or for another app."""


def verify_google_token(token: str) -> dict:
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise GoogleNotConfigured()
    try:
        # Checks signature, expiry, issuer, and that the audience is our client ID.
        return id_token.verify_oauth2_token(token, _request, client_id)
    except ValueError as exc:
        raise GoogleTokenError(str(exc)) from exc