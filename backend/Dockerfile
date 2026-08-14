# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# libpq for psycopg2; the build toolchain is not needed because psycopg2-binary
# ships wheels, so the runtime image stays small.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY . .

# Run as a non-root user.
RUN useradd --create-home --uid 10001 devnotes \
    && chown -R devnotes /app
USER devnotes

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8000/health || exit 1

# No --reload: this image is for running the app, not editing it.
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
