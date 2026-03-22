import time
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import get_settings
from app.logutil import log_json
from app.metrics import (
    HTTP_ERRORS_TOTAL,
    HTTP_REQUEST_DURATION_MS,
    HTTP_REQUESTS_TOTAL,
)
from app.modules.health_router import router as health_router
from app.modules.payments_router import router as payments_router


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.service_name)

    @app.middleware("http")
    async def request_observability(request: Request, call_next):
        rid = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = rid
        start = time.perf_counter()
        log_json(
            "info",
            "request received",
            requestId=rid,
            method=request.method,
            path=str(request.url.path),
        )
        response = await call_next(request)
        response.headers["X-Request-Id"] = rid
        duration_ms = (time.perf_counter() - start) * 1000
        HTTP_REQUESTS_TOTAL.inc()
        HTTP_REQUEST_DURATION_MS.observe(duration_ms)
        if response.status_code >= 400:
            HTTP_ERRORS_TOTAL.inc()
        log_json(
            "info",
            "request completed",
            requestId=rid,
            method=request.method,
            path=str(request.url.path),
            statusCode=response.status_code,
            durationMs=round(duration_ms, 3),
        )
        return response

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        rid = getattr(request.state, "request_id", "")
        code = "VALIDATION_ERROR" if exc.status_code == 400 else f"HTTP_{exc.status_code}"
        detail = exc.detail
        msg = detail if isinstance(detail, str) else str(detail)
        log_json(
            "error",
            "request failed",
            requestId=rid,
            statusCode=exc.status_code,
            error=code,
            message=msg,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": code, "message": msg, "requestId": rid},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError):
        rid = getattr(request.state, "request_id", "")
        log_json(
            "error",
            "request failed",
            requestId=rid,
            statusCode=422,
            error="VALIDATION_ERROR",
            message=str(exc.errors()),
        )
        return JSONResponse(
            status_code=422,
            content={
                "error": "VALIDATION_ERROR",
                "message": exc.errors(),
                "requestId": rid,
            },
        )

    @app.exception_handler(Exception)
    async def unhandled(request: Request, exc: Exception):  # noqa: BLE001
        rid = getattr(request.state, "request_id", "")
        log_json(
            "error",
            "request failed",
            requestId=rid,
            statusCode=500,
            error="INTERNAL_ERROR",
            message=str(exc),
        )
        return JSONResponse(
            status_code=500,
            content={"error": "INTERNAL_ERROR", "message": str(exc), "requestId": rid},
        )

    @app.get("/")
    def root():
        return {
            "service": settings.service_name,
            "message": "Forgeops-generated FastAPI service",
            "modules": ["health", "payments"],
        }

    app.include_router(health_router)
    app.include_router(payments_router)
    return app


app = create_app()
