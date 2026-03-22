from fastapi import APIRouter
from fastapi.responses import JSONResponse, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def liveness():
    s = get_settings()
    return {"status": "ok", "service": s.service_name}


@router.get("/ready")
def readiness():
    s = get_settings()
    if not s.database_url:
        return {"status": "ready", "checks": {"database": "not_configured"}}
    if not s.database_url.startswith("postgres"):
        return {"status": "ready", "checks": {"database": "skipped_non_postgres"}}
    try:
        import psycopg

        with psycopg.connect(s.database_url, connect_timeout=2) as conn:
            conn.execute("SELECT 1")
        return {"status": "ready", "checks": {"database": "ok"}}
    except Exception as exc:  # noqa: BLE001
        return JSONResponse(
            status_code=503,
            content={
                "error": "NOT_READY",
                "message": "database check failed",
                "checks": {"database": "failed", "detail": str(exc)},
            },
        )


@router.get("/metrics")
def metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
