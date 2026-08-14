"""Convenience entrypoint: `python main.py` from the repository root.

`backend/app` imports itself as the top-level package `app` (`from app.config
import ...`), which only resolves with `backend/` on the path. Without the
insert below this file raised ModuleNotFoundError on import, so it looked like
a working entrypoint and was not one.

`npm run dev:backend` remains the usual way to run the API with reload.
"""
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.main import app  # noqa: E402  (import needs the path above)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
