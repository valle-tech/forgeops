import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import get_settings
from app.logutil import log_json
from app.modules.health_router import router as health_router
from app.modules.payments_router import router as payments_router


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.service_name)

    @app.middleware("http")
    async def add_request_logging(request: Request, call_next):
        rid = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = rid
        log_json(
            "info",
            "request received",
            requestId=rid,
            method=request.method,
            path=str(request.url.path),
        )
        response = await call_next(request)
        response.headers["x-request-id"] = rid
        log_json(
            "info",
            "request completed",
            requestId=rid,
            method=request.method,
            path=str(request.url.path),
        )
        return response

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        rid = getattr(request.state, "request_id", "")
        code = "VALIDATION_ERROR" if exc.status_code == 400 else f"HTTP_{exc.status_code}"
        detail = exc.detail
        msg = detail if isinstance(detail, str) else str(detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": code, "message": msg, "requestId": rid},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError):
        rid = getattr(request.state, "request_id", "")
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
