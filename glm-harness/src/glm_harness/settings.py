from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    glm_api_key: str = ""
    glm_model: str = "glm-4-flash"
    glm_base_url: str = "https://open.bigmodel.cn/api/paas/v4/"
    baseline_model: str = "claude-3-5-sonnet"
    host: str = "0.0.0.0"
    port: int = 8000
    max_memory_turns: int = 20  # sliding window before summarisation
    summarise_threshold: int = 16  # start summarising at this many turns


settings = Settings()


# Pricing per 1M tokens (input / output) in USD
PRICING: dict[str, tuple[float, float]] = {
    # GLM models (Zhipu AI)
    "glm-4-flash": (0.0, 0.0),          # genuinely free
    "glm-4": (1.0, 1.0),
    "glm-4-plus": (7.0, 7.0),
    "glm-z1-flash": (0.0, 0.0),
    # Baselines
    "claude-3-5-sonnet": (3.0, 15.0),
    "claude-3-opus": (15.0, 75.0),
    "gpt-4o": (5.0, 15.0),
    "gpt-4-turbo": (10.0, 30.0),
}
