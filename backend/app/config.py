import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "CivicPulse AI"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "civicpulse-secret-key-change-in-production-chandigarh"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    DATABASE_URL: str = "sqlite:///./civicpulse.db"
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    ENVIRONMENT: str = "development"

    # LLM text-extraction chain (voice/typed report -> category, sector, landmark).
    # Tried in order: Gemini -> Groq -> OpenRouter; a provider with no key is skipped.
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.1-flash-lite"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-20b"
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "google/gemma-4-31b-it:free"
    LLM_TIMEOUT_SECONDS: float = 12.0

    # TaskVox AI voice calls to field workers on assignment. Calls are skipped until
    # both the API key and the agent ID are set.
    TASKVOX_API_KEY: str = "tvx_1df80dd3dde3e96f3033b7b4c0ef3f2ebc565cd0f33b7cf4064903dbab7049d0"
    TASKVOX_AGENT_ID: str = "mc-office-mvkq32k4"
    TASKVOX_BASE_URL: str = "https://taskvox.in"
    TASKVOX_TIMEOUT_SECONDS: float = 15.0
    # Comma-separated worker full names to call; "*" calls every assigned worker.
    TASKVOX_CALL_WORKERS: str = "Vikram Singh"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:4173",
    ]
    CORS_ORIGIN_REGEX: str = (
        r"^http://(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}"
        r"|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}):"
        r"(?:5173|4173)$"
    )

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
