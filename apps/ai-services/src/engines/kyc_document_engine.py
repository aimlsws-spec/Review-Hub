"""Reads a KYC document image and checks it against what the user typed.

Spec FR-012/FR-013: OCR validation of uploaded KYC documents, with manual review
when confidence is low. This engine only *compares*; it never approves. OCR can
read the text on an edited image just as well as on a real card, so a match is
a helpful signal for the admin reviewer, not proof of identity.

Privacy: nothing read from the document is returned. The answer is only
whether the typed number and the account holder's name were found on it.
"""
import re
from dataclasses import dataclass
from typing import Optional

# Document types whose number has a fixed, checkable shape on the card.
_NUMBER_PATTERNS = {
    "PAN": re.compile(r"[A-Z]{5}[0-9]{4}[A-Z]"),
    "AADHAAR": re.compile(r"[0-9]{12}"),
}

# OCR commonly misreads these characters; used only when comparing a PAN's letter/digit positions.
_DIGIT_LOOKALIKES = str.maketrans({"O": "0", "D": "0", "I": "1", "L": "1", "Z": "2", "S": "5", "B": "8", "G": "6"})
_LETTER_LOOKALIKES = str.maketrans({"0": "O", "1": "I", "2": "Z", "5": "S", "8": "B", "6": "G"})

# Name parts shorter than this ("K", "M.") are too common in any text to count as found.
_MIN_NAME_PART = 3


@dataclass
class KycReadResult:
    status: str  # MATCH | PARTIAL | MISMATCH | UNREADABLE | UNAVAILABLE
    ocr_available: bool
    text_found: bool
    number_matches: Optional[bool]
    name_matches: Optional[bool]
    confidence: float

    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "ocrAvailable": self.ocr_available,
            "textFound": self.text_found,
            "numberMatches": self.number_matches,
            "nameMatches": self.name_matches,
            "confidence": self.confidence,
        }


def _compact(text: str) -> str:
    """Upper case with everything but letters and digits removed, so spacing and punctuation don't matter."""
    return re.sub(r"[^A-Z0-9]", "", text.upper())


def _normalise_pan_candidate(candidate: str) -> str:
    """A PAN is 5 letters, 4 digits, 1 letter; repair the usual OCR confusions position by position."""
    if len(candidate) != 10:
        return candidate
    letters = candidate[:5].translate(_LETTER_LOOKALIKES)
    digits = candidate[5:9].translate(_DIGIT_LOOKALIKES)
    last = candidate[9].translate(_LETTER_LOOKALIKES)
    return letters + digits + last


def number_found(document_type: str, typed_number: Optional[str], text: str) -> Optional[bool]:
    """Whether the number the user typed appears in the text. None when there is nothing to compare."""
    if not typed_number:
        return None
    expected = _compact(typed_number)
    if not expected:
        return None
    compact_text = _compact(text)
    if expected in compact_text:
        return True
    if document_type == "PAN":
        # Try every 10-character window after repairing look-alike characters.
        for start in range(0, max(len(compact_text) - 9, 0)):
            if _normalise_pan_candidate(compact_text[start : start + 10]) == expected:
                return True
    return False


def name_found(full_name: Optional[str], text: str) -> Optional[bool]:
    """Whether every meaningful part of the account holder's name appears in the text."""
    if not full_name:
        return None
    parts = [part for part in re.split(r"[^A-Za-z]+", full_name.upper()) if len(part) >= _MIN_NAME_PART]
    if not parts:
        return None
    words = set(re.split(r"[^A-Z]+", text.upper()))
    compact_text = _compact(text)
    return all(part in words or part in compact_text for part in parts)


class KycDocumentEngine:
    def __init__(self, ocr_service):
        self._ocr = ocr_service

    def read(self, document_type: str, typed_number: Optional[str], full_name: Optional[str], image_bytes: bytes) -> KycReadResult:
        if not self._ocr.available:
            return KycReadResult("UNAVAILABLE", False, False, None, None, 0.0)

        text = self._ocr.extract_text(image_bytes) or ""
        if len(_compact(text)) < 6:
            # Blank, a PDF (Tesseract reads images only), or too blurred to read anything.
            return KycReadResult("UNREADABLE", True, False, None, None, 0.0)

        number_ok = number_found(document_type.upper(), typed_number, text)
        name_ok = name_found(full_name, text)
        checks = [result for result in (number_ok, name_ok) if result is not None]
        if not checks:
            return KycReadResult("UNREADABLE", True, True, number_ok, name_ok, 0.0)

        passed = sum(1 for result in checks if result)
        confidence = round(passed / len(checks), 2)
        if passed == len(checks):
            status = "MATCH"
        elif passed == 0:
            status = "MISMATCH"
        else:
            status = "PARTIAL"
        return KycReadResult(status, True, True, number_ok, name_ok, confidence)


__all__ = ["KycDocumentEngine", "KycReadResult", "name_found", "number_found"]
