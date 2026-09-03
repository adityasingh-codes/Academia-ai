from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = Field(default="sqlite+aiosqlite:///./test.db", validation_alias=AliasChoices("DATABASE_URL", "CLP_DATABASE_URL"))
    jwt_secret: str = Field(default="supersecretkey123456789", validation_alias=AliasChoices("JWT_SECRET", "CLP_JWT_SECRET"))
    openai_api_key: str | None = Field(default=None, validation_alias=AliasChoices("OPENAI_API_KEY", "CLP_OPENAI_API_KEY"))
    vector_db_url: str = Field(default="http://localhost:6333", validation_alias=AliasChoices("VECTOR_DB_URL", "CLP_VECTOR_DB_URL"))
    vector_db_api_key: str | None = Field(default=None, validation_alias=AliasChoices("VECTOR_DB_API_KEY", "CLP_VECTOR_DB_API_KEY"))
    jwt_algorithm: str = Field(default="HS256", validation_alias=AliasChoices("ALGORITHM", "CLP_JWT_ALGORITHM"))
    access_token_minutes: int = Field(default=30, validation_alias=AliasChoices("ACCESS_TOKEN_EXPIRE_MINUTES", "CLP_ACCESS_TOKEN_MINUTES"))
    upload_dir: str = "uploads"
    model_config = SettingsConfigDict(env_file=".env", env_prefix="CLP_", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
