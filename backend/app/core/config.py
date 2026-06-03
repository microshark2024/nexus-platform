# backend/app/core/config.py
from typing import List, Union, Annotated
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json

class NoDecode:
    """Marker class to avoid automatic JSON decoding or to handle custom string parsing."""
    pass

def parse_origins(v: Union[str, List[str]]) -> List[str]:
    if isinstance(v, list):
        return v
    if isinstance(v, str):
        v = v.strip()
        if not v:
            return []
        # Check if it looks like a JSON array
        if v.startswith('[') and v.endswith(']'):
            try:
                return json.loads(v)
            except Exception:
                pass
        # Fallback to comma-separated values
        return [origin.strip() for origin in v.split(',') if origin.strip()]
    return []

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    # Supabase configurations
    SUPABASE_URL: str
    SUPABASE_SECRET_KEY: str
    SUPABASE_PUBLISHABLE_KEY: str

    # LLM configurations
    LLM_API_KEY: str = ""
    LLM_API_BASE: str = "https://api.openai.com/v1"
    LLM_MODEL: str = "gpt-4o"

    # CORS settings
    ALLOWED_ORIGINS: Annotated[Union[List[str], str], NoDecode] = ["http://localhost:3000", "http://localhost:3001"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def validate_origins(cls, v: Union[str, List[str]]) -> List[str]:
        return parse_origins(v)

settings = Settings()
