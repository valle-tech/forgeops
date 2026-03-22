from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("")
def list_payments():
    return {"domain": "payments", "items": []}


@router.get("/demo-error")
def demo_error(request: Request):
    rid = getattr(request.state, "request_id", "")
    return JSONResponse(
        status_code=400,
        content={"error": "VALIDATION_ERROR", "message": "Invalid input", "requestId": rid},
    )
