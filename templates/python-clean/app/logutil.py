import json
import sys
from datetime import datetime, timezone
from typing import Any

from app.config import get_settings


def log_json(level: str, message: str, **fields: Any) -> None:
    s = get_settings()
    merged = {k: v for k, v in fields.items() if v is not None and v != ""}
    line = {
        "level": level,
        "service": s.service_name,
        "message": message,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        **merged,
    }
    sys.stdout.write(json.dumps(line, default=str) + "\n")
    sys.stdout.flush()
