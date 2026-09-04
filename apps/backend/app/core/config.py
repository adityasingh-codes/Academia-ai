from functools import lru_cache

from pydantic import AliasChoices, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Universal Adaptive AI Tutor Engine"
    OPENAI_API_KEY: SecretStr | None = Field(
        default=None,
        validation_alias=AliasChoices("OPENAI_API_KEY", "CLP_OPENAI_API_KEY"),
    )
    EMBEDDING_MODEL_NAME: str = "text-embedding-3-small"
    CHUNK_SIZE: int = 600
    CHUNK_OVERLAP: int = 120
    CHROMA_PERSIST_DIRECTORY: str = "./storage/chromadb"
    database_url: str = Field(default="sqlite+aiosqlite:///./test.db", validation_alias=AliasChoices("DATABASE_URL", "CLP_DATABASE_URL"))
    jwt_secret: str = Field(default="supersecretkey123456789", validation_alias=AliasChoices("JWT_SECRET", "CLP_JWT_SECRET"))
    jwt_algorithm: str = Field(default="HS256", validation_alias=AliasChoices("ALGORITHM", "CLP_JWT_ALGORITHM"))
    access_token_minutes: int = Field(default=30, validation_alias=AliasChoices("ACCESS_TOKEN_EXPIRE_MINUTES", "CLP_ACCESS_TOKEN_MINUTES"))
    upload_dir: str = "uploads"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    @property
    def openai_api_key(self) -> str | None:
        return self.OPENAI_API_KEY.get_secret_value() if self.OPENAI_API_KEY else None


@lru_cache
def get_settings() -> Settings:
    return Settings()
