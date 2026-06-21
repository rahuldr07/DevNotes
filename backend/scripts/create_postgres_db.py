"""Create the DevNotes PostgreSQL role and database.

Run from the backend directory after installing backend requirements:
    python scripts/create_postgres_db.py

The script reads backend/.env when present. It uses POSTGRES_ADMIN_* values for
the maintenance connection and DB_* values for the application database.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path

import psycopg2
from psycopg2 import sql


BACKEND_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = BACKEND_DIR / ".env"


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if value is None or value == "":
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def connect(
    *,
    dbname: str,
    user: str,
    password: str,
    host: str,
    port: int,
    sslmode: str,
):
    return psycopg2.connect(
        dbname=dbname,
        user=user,
        password=password,
        host=host,
        port=port,
        sslmode=sslmode,
    )


def role_exists(conn, role_name: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (role_name,))
        return cur.fetchone() is not None


def database_exists(conn, db_name: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
        return cur.fetchone() is not None


def create_or_update_role(conn, *, role_name: str, password: str) -> None:
    with conn.cursor() as cur:
        if role_exists(conn, role_name):
            cur.execute(
                sql.SQL("ALTER ROLE {} WITH LOGIN PASSWORD %s").format(
                    sql.Identifier(role_name),
                ),
                (password,),
            )
            print(f"Updated PostgreSQL role: {role_name}")
            return

        cur.execute(
            sql.SQL("CREATE ROLE {} WITH LOGIN PASSWORD %s").format(
                sql.Identifier(role_name),
            ),
            (password,),
        )
        print(f"Created PostgreSQL role: {role_name}")


def create_database(conn, *, db_name: str, owner: str) -> None:
    if database_exists(conn, db_name):
        print(f"PostgreSQL database already exists: {db_name}")
        return

    with conn.cursor() as cur:
        cur.execute(
            sql.SQL("CREATE DATABASE {} OWNER {}").format(
                sql.Identifier(db_name),
                sql.Identifier(owner),
            ),
        )
    print(f"Created PostgreSQL database: {db_name}")


def grant_schema_privileges(conn, *, db_user: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            sql.SQL("GRANT USAGE, CREATE ON SCHEMA public TO {}").format(
                sql.Identifier(db_user),
            ),
        )
        cur.execute(
            sql.SQL("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO {}").format(
                sql.Identifier(db_user),
            ),
        )
        cur.execute(
            sql.SQL("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO {}").format(
                sql.Identifier(db_user),
            ),
        )
    print(f"Granted schema privileges to: {db_user}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create the DevNotes PostgreSQL database.")
    parser.add_argument("--skip-role", action="store_true", help="Do not create or alter DB_USER.")
    return parser.parse_args()


def main() -> None:
    load_env_file(ENV_PATH)
    args = parse_args()

    db_host = env("DB_HOST", "localhost")
    db_port = int(env("DB_PORT", "5432"))
    db_name = env("DB_NAME", "devnotes")
    db_user = env("DB_USER", "devnotes")
    db_password = env("DB_PASSWORD", "devnotes")
    db_ssl_mode = env("DB_SSL_MODE", "disable")

    admin_db = env("POSTGRES_ADMIN_DB", "postgres")
    admin_user = env("POSTGRES_ADMIN_USER", "postgres")
    admin_password = env("POSTGRES_ADMIN_PASSWORD", "postgres")

    admin_conn = connect(
        dbname=admin_db,
        user=admin_user,
        password=admin_password,
        host=db_host,
        port=db_port,
        sslmode=db_ssl_mode,
    )
    admin_conn.autocommit = True

    try:
        if not args.skip_role:
            create_or_update_role(admin_conn, role_name=db_user, password=db_password)
        create_database(admin_conn, db_name=db_name, owner=db_user)
    finally:
        admin_conn.close()

    app_conn = connect(
        dbname=db_name,
        user=admin_user,
        password=admin_password,
        host=db_host,
        port=db_port,
        sslmode=db_ssl_mode,
    )
    app_conn.autocommit = True

    try:
        grant_schema_privileges(app_conn, db_user=db_user)
    finally:
        app_conn.close()

    verify_conn = connect(
        dbname=db_name,
        user=db_user,
        password=db_password,
        host=db_host,
        port=db_port,
        sslmode=db_ssl_mode,
    )

    try:
        with verify_conn.cursor() as cur:
            cur.execute("SELECT current_database(), current_user")
            database, user = cur.fetchone()
        print(f"Connected as {user} to database {database}")
    finally:
        verify_conn.close()


if __name__ == "__main__":
    main()
