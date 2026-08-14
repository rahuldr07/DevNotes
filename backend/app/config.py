from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


PLACEHOLDER_SECRETS = {
    "change-this-local-dev-secret",
    "changeme",
    "secret",
    "test-secret-key",
}


class Settings(BaseSettings):
    """
    All app settings in one place.
    Pydantic Settings automatically reads from .env and validates types.

    Example: if you put DB_PORT=abc in .env,
    the app crashes immediately with a clear error
    instead of failing randomly later.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database connection
    DB_HOST: str
    DB_PORT: int = 5432
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    DB_SSL_MODE: str = "require"

    # Connection pool tuning
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800

    # Auth settings (add SECRET_KEY to your .env file)
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Deployment posture. "production" tightens the startup checks below,
    # hides the interactive API docs, and refuses placeholder secrets.
    ENVIRONMENT: str = "development"

    # Comma-separated browser origins allowed to call the API directly.
    # With the BFF proxy in front, production usually needs none.
    CORS_ORIGINS: str = "http://localhost:3000"

    # Only enable when a trusted reverse proxy (the Next BFF, an ALB, ...)
    # is the sole ingress AND it overwrites X-Forwarded-For. Leaving this
    # off means anonymous rate limits are keyed on the direct peer address.
    TRUST_FORWARDED_FOR: bool = False

    @field_validator("ENVIRONMENT")
    @classmethod
    def environment_must_be_known(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if cleaned not in {"development", "test", "production"}:
            raise ValueError(
                "ENVIRONMENT must be one of: development, test, production"
            )
        return cleaned

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    def validate_for_runtime(self) -> None:
        """Fail fast on configuration that is unsafe to serve traffic with.

        Called from the app lifespan rather than the model validator so that
        unit tests and tooling can import Settings with throwaway values.
        """
        if not self.is_production:
            return
        if self.SECRET_KEY.strip().lower() in PLACEHOLDER_SECRETS:
            raise RuntimeError(
                "SECRET_KEY is still the example placeholder — set a unique value."
            )
        if len(self.SECRET_KEY) < 32:
            raise RuntimeError(
                "SECRET_KEY must be at least 32 characters in production."
            )
        if self.DB_SSL_MODE == "disable":
            raise RuntimeError(
                "DB_SSL_MODE=disable is not allowed in production."
            )

    @property
    def DATABASE_URL(self) -> str:
        """
        Builds the full PostgreSQL connection string.

        Result looks like:
        postgresql://user:pass@host:5432/dbname?sslmode=require
        """
        return (
            f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?sslmode={self.DB_SSL_MODE}"
        )

@lru_cache()
def get_settings() -> Settings:
    """
    Returns a cached Settings instance.
    
    @lru_cache means: the first call reads .env and creates Settings.
    Every subsequent call returns the SAME object without re-reading.
    This is a performance optimization.
    """
    return Settings()
