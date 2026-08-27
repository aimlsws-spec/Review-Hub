"""Screenshot/proof text extraction via a locally-installed Tesseract binary.

Free and fully local — no API key, no network call. If Tesseract itself
isn't installed on the machine (pytesseract is just a wrapper around the
binary), this degrades to `available = False` rather than raising, so the
rest of verification still runs on heuristics alone.
"""
import io
from typing import Optional

from ..core.config import Settings
from ..core.logging import get_logger

try:
    import pytesseract
    from PIL import Image

    _PACKAGES_AVAILABLE = True
except ImportError:
    _PACKAGES_AVAILABLE = False

logger = get_logger(__name__)


class OcrService:
    def __init__(self, settings: Settings):
        self._enabled = settings.ocr_enabled and _PACKAGES_AVAILABLE
        if self._enabled and settings.tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd
        self._checked = False
        self._binary_available = False

    @property
    def available(self) -> bool:
        if not self._enabled:
            return False
        if not self._checked:
            self._checked = True
            try:
                pytesseract.get_tesseract_version()
                self._binary_available = True
            except Exception:
                logger.warning(
                    "Tesseract OCR binary not found — OCR verification disabled, "
                    "falling back to heuristics only. Install it to enable OCR: "
                    "https://github.com/UB-Mannheim/tesseract/wiki"
                )
                self._binary_available = False
        return self._binary_available

    def extract_text(self, image_bytes: bytes) -> Optional[str]:
        if not self.available:
            return None
        try:
            image = Image.open(io.BytesIO(image_bytes))
            return pytesseract.image_to_string(image)
        except Exception:
            logger.exception("OCR extraction failed for a submission's evidence file")
            return None
