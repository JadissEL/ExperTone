"""Pytest configuration. Set env vars before imports to avoid DB connection at load."""

import os

# Ensure DATABASE_URL exists so database.py doesn't raise at import
if not os.environ.get("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "postgresql://dummy:dummy@localhost:5432/dummy"
