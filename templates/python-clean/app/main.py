import os
from fastapi import FastAPI, Response
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST

SERVICE_NAME = "{{SERVICE_NAME}}"
app = FastAPI(title=SERVICE_NAME)

REQUESTS = Counter("http_requests_total", "Total HTTP requests", ["service"])
ERRORS = Counter("http_errors_total", "Total HTTP errors", ["service"])


@app.get("/")
def root():
    REQUESTS.labels(service="{{SERVICE_SLUG}}").inc()
    return {"service": SERVICE_NAME, "message": "Forgeops-generated FastAPI service"}


@app.get("/health")
def health():
    return {"status": "ok", "service": SERVICE_NAME}


@app.get("/metrics")
def metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
