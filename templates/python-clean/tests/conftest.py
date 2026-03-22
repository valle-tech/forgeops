import os

# Must run before `app` imports so Settings() validates.
os.environ.setdefault("SERVICE_NAME", "pytest-service")
os.environ.setdefault("DATABASE_URL", "")
