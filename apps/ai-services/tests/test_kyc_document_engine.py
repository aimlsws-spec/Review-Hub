from src.engines.kyc_document_engine import KycDocumentEngine, name_found, number_found


class _FakeOcr:
    def __init__(self, available: bool = True, text: str | None = None):
        self.available = available
        self._text = text

    def extract_text(self, _image_bytes: bytes):
        return self._text


PAN_CARD_TEXT = """INCOME TAX DEPARTMENT  GOVT. OF INDIA
Permanent Account Number Card
ABCPD1234F
Name
RAHUL KUMAR SHARMA
Father's Name
SURESH SHARMA
"""


def test_match_when_number_and_name_are_on_the_card():
    result = KycDocumentEngine(_FakeOcr(text=PAN_CARD_TEXT)).read("PAN", "ABCPD1234F", "Rahul Sharma", b"img")
    assert result.status == "MATCH"
    assert result.number_matches is True and result.name_matches is True
    assert result.confidence == 1.0


def test_pan_survives_common_ocr_confusions():
    # O for 0, I for 1, S for 5 inside the digits; spaces in the middle.
    assert number_found("PAN", "ABCPD1234F", "ABCPD I234F") is True
    assert number_found("PAN", "ABCPD1054F", "ABCPD IOS4F") is True


def test_mismatch_when_neither_is_on_the_card():
    result = KycDocumentEngine(_FakeOcr(text=PAN_CARD_TEXT)).read("PAN", "ZZZZZ9999Z", "Priya Patel", b"img")
    assert result.status == "MISMATCH"
    assert result.confidence == 0.0


def test_partial_when_only_the_number_matches():
    result = KycDocumentEngine(_FakeOcr(text=PAN_CARD_TEXT)).read("PAN", "ABCPD1234F", "Priya Patel", b"img")
    assert result.status == "PARTIAL"
    assert result.number_matches is True and result.name_matches is False


def test_unreadable_when_ocr_finds_nothing():
    result = KycDocumentEngine(_FakeOcr(text="  \n ")).read("PAN", "ABCPD1234F", "Rahul Sharma", b"img")
    assert result.status == "UNREADABLE"
    assert result.text_found is False


def test_unavailable_without_tesseract():
    result = KycDocumentEngine(_FakeOcr(available=False)).read("PAN", "ABCPD1234F", "Rahul Sharma", b"img")
    assert result.to_dict() == {
        "status": "UNAVAILABLE",
        "ocrAvailable": False,
        "textFound": False,
        "numberMatches": None,
        "nameMatches": None,
        "confidence": 0.0,
    }


def test_short_name_parts_are_ignored_and_order_does_not_matter():
    assert name_found("R. K. Sharma", "SHARMA RAHUL") is True
    assert name_found("K M", "anything") is None


def test_result_never_contains_the_document_text():
    payload = KycDocumentEngine(_FakeOcr(text=PAN_CARD_TEXT)).read("PAN", "ABCPD1234F", "Rahul Sharma", b"img").to_dict()
    assert "ABCPD1234F" not in str(payload)
    assert "SHARMA" not in str(payload)
