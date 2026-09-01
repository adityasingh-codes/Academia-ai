from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    openai_api_key: str | None = Field(default=None, validation_alias=AliasChoices("OPENAI_API_KEY", "CLP_OPENAI_API_KEY"))
    vector_db_url: str = Field(default="http://localhost:6333", validation_alias=AliasChoices("VECTOR_DB_URL", "CLP_VECTOR_DB_URL"))
    vector_db_api_key: str | None = Field(default=None, validation_alias=AliasChoices("VECTOR_DB_API_KEY", "CLP_VECTOR_DB_API_KEY"))
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60 * 24
    upload_dir: str = "uploads"
    model_config = SettingsConfigDict(env_file=".env", env_prefix="CLP_", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
