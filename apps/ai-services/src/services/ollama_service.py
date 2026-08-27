"""Optional human-readable explanation text via a locally-run Ollama instance.

Ollama is free, runs entirely on the local machine, and exposes an
OpenAI-compatible HTTP API — no paid provider or API key is used or required
anywhere in this service. Disabled by default (see Settings.llm_enabled);
even when enabled, a connection failure (Ollama not running) degrades to
`available = False` mid-flight rather than breaking verification.
"""
from typing import Optional

from ..core.config import Settings
from ..core.logging import get_logger

try:
    from langchain_openai import ChatOpenAI

    _PACKAGES_AVAILABLE = True
except ImportError:
    _PACKAGES_AVAILABLE = False

logger = get_logger(__name__)


class OllamaService:
    def __init__(self, settings: Settings):
        self._enabled = settings.llm_enabled and _PACKAGES_AVAILABLE
        self._llm = None
        if self._enabled:
            self._llm = ChatOpenAI(
                base_url=settings.ollama_base_url,
                api_key="ollama",  # Ollama ignores this; the client just requires a non-empty string.
                model=settings.ollama_model,
                timeout=settings.request_timeout_seconds,
            )

    @property
    def available(self) -> bool:
        return self._enabled and self._llm is not None

    async def ask(self, prompt: str) -> Optional[str]:
        if not self.available:
            return None
        try:
            response = await self._llm.ainvoke(prompt)
            return str(response.content)
        except Exception:
            logger.warning("Ollama call failed — is `ollama serve` running locally? Continuing without LLM assist.")
            return None
