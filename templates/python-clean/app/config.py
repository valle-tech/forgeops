"""Validated environment — fails fast on invalid config."""

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    port: int = Field(default={{PORT}}, ge=1, le=65535)
    service_name: str = Field(min_length=1, alias="SERVICE_NAME")
    database_url: str = Field(default="", alias="DATABASE_URL")
    log_format: str = Field(default="json", alias="LOG_FORMAT")

    @field_validator("log_format")
    @classmethod
    def logfmt(cls, v: str) -> str:
        if v not in ("json", "pretty"):
            raise ValueError("LOG_FORMAT must be json or pretty")
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
