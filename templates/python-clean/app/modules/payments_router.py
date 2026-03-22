from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.logutil import log_json

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("")
def list_payments(request: Request):
    rid = getattr(request.state, "request_id", "")
    log_json(
        "info",
        "important action",
        requestId=rid,
        action="list_payments",
        domain="payments",
    )
    return {"domain": "payments", "items": []}


@router.get("/demo-error")
def demo_error(request: Request):
    rid = getattr(request.state, "request_id", "")
    return JSONResponse(
        status_code=400,
        content={"error": "VALIDATION_ERROR", "message": "Invalid input", "requestId": rid},
    )
