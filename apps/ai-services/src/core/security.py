"""Validates that a call into this service's own endpoints (the reverse
direction from the verification worker, which calls out to the backend)
actually comes from the backend — same shared X-Api-Key/X-Api-Secret pair
used everywhere else in this integration.
"""
import secrets

from fastapi import Depends, Header, HTTPException, status

from .config import Settings, get_settings


def verify_backend_credentials(
    x_api_key: str = Header(..., alias="X-Api-Key"),
    x_api_secret: str = Header(..., alias="X-Api-Secret"),
    settings: Settings = Depends(get_settings),
) -> None:
    valid = secrets.compare_digest(x_api_key, settings.ai_service_api_key) and secrets.compare_digest(
        x_api_secret, settings.ai_service_api_secret
    )
    if not valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API credentials")
