from prometheus_client import Counter, Histogram

HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP requests",
)
HTTP_ERRORS_TOTAL = Counter(
    "http_errors_total",
    "Total failed HTTP requests (status >= 400)",
)
HTTP_REQUEST_DURATION_MS = Histogram(
    "http_request_duration_ms",
    "HTTP request duration in milliseconds",
    buckets=(5.0, 10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0, 2500.0, 5000.0),
)
