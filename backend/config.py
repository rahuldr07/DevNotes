from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """
    All app settings in one place.
    Pydantic automatically reads from .env and validates types.
    
    Example: if you put DB_PORT=abc in .env, 
    the app crashes immediately with a clear error
    instead of failing randomly later.
    """

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

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """
    Returns a cached Settings instance.
    
    @lru_cache means: the first call reads .env and creates Settings.
    Every subsequent call returns the SAME object without re-reading.
    This is a performance optimization.
    """
    return Settings()
