import json
import sys
import time
from typing import Any

from app.config import get_settings


def log_json(level: str, message: str, **fields: Any) -> None:
    s = get_settings()
    line = {
        "level": level,
        "service": s.service_name,
        "message": message,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        **fields,
    }
    sys.stdout.write(json.dumps(line, default=str) + "\n")
    sys.stdout.flush()
