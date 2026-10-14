from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./data/elearning.db"
    upload_dir: str = "./data/uploads"

    jwt_secret: str = "change-me"
    jwt_expire_minutes: int = 60 * 12

    # Only emails on this domain may be created / log in. Empty = any domain.
    company_email_domain: str = ""

    # First admin, created on startup if no users exist.
    admin_email: str = "admin@company.uz"
    admin_password: str = "admin12345"

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-5-5"

    cors_origins: str = "http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()
