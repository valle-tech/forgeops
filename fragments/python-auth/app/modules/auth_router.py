import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from jose import jwt

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login() -> dict:
    """Demo JWT — replace with real user verification."""
    secret = os.getenv("JWT_SECRET") or "change-me-in-production"
    payload = {
        "sub": "demo-user",
        "roles": ["admin"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        "iss": os.getenv("SERVICE_NAME", "service"),
    }
    token = jwt.encode(payload, secret, algorithm="HS256")
    return {"access_token": token, "token_type": "Bearer", "expires_in": 3600}
