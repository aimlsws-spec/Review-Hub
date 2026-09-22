"""Fingerprints for evidence images, used by the backend to spot the same picture submitted twice.

A cryptographic checksum only catches byte-identical files: saving the picture again, recompressing it,
resizing it or taking a screenshot of it changes every byte. A perceptual hash stays (almost) the same
for those changes, so two hashes that differ in only a few bits are the same picture.

Free and local: Pillow only, no model and no network call. Like OCR, it degrades to "no fingerprint"
rather than failing verification when the image cannot be read.
"""
import io
import re
from typing import Optional

try:
    from PIL import Image, ImageOps, ImageStat

    _PILLOW_AVAILABLE = True
except ImportError:
    _PILLOW_AVAILABLE = False

# dHash compares neighbouring pixels of a 9x8 greyscale thumbnail: 8 comparisons x 8 rows = 64 bits.
_HASH_COLUMNS = 9
_HASH_ROWS = 8

# Below this the picture is too small to tell apart from another small one.
_MIN_SIDE_PIXELS = 16

# A flat image (blank, single colour) has no structure, so every one hashes to the same value and would
# look like a "duplicate" of every other flat image. Such images get no fingerprint at all.
_MIN_BRIGHTNESS_STDDEV = 3.0

# OCR text shorter than this (letters and digits only) is treated as "no meaningful text", i.e. a photo.
_MIN_MEANINGFUL_TEXT_CHARS = 20
_MAX_STORED_TEXT_CHARS = 1000


def dhash(image_bytes: bytes) -> Optional[str]:
    """64-bit difference hash as 16 lowercase hex characters, or None when the bytes are not a usable image.

    Unchanged by recompression, resizing, small brightness changes and (via the EXIF orientation flag) by a
    phone rotating the picture. Not unchanged by cropping or by editing the picture's content.
    """
    if not _PILLOW_AVAILABLE or not image_bytes:
        return None
    try:
        with Image.open(io.BytesIO(image_bytes)) as image:
            # Phones store many photos sideways and rely on an EXIF flag; apply it so the same photo always
            # hashes the same however it was saved.
            grey = ImageOps.exif_transpose(image).convert("L")
        if min(grey.size) < _MIN_SIDE_PIXELS:
            return None
        if ImageStat.Stat(grey).stddev[0] < _MIN_BRIGHTNESS_STDDEV:
            return None

        thumbnail = grey.resize((_HASH_COLUMNS, _HASH_ROWS), Image.Resampling.LANCZOS)
        pixels = thumbnail.tobytes()  # 'L' mode: one byte per pixel, row by row

        bits = 0
        for row in range(_HASH_ROWS):
            for column in range(_HASH_COLUMNS - 1):
                left = pixels[row * _HASH_COLUMNS + column]
                right = pixels[row * _HASH_COLUMNS + column + 1]
                bits = (bits << 1) | (1 if left > right else 0)
        return f"{bits:016x}"
    except Exception:
        # Not an image (e.g. a video), truncated, or an oversized "decompression bomb": no fingerprint.
        return None


def normalize_evidence_text(ocr_text: Optional[str]) -> Optional[str]:
    """The text found in a screenshot, reduced to lowercase words so two OCR passes can be compared.

    Three meanings, which the backend relies on:
      None -> OCR did not run, so we cannot say anything about the text.
      ""   -> OCR ran but found no meaningful text: most likely a photo, not a screenshot.
      text -> the normalised words, capped so it stays small.
    """
    if ocr_text is None:
        return None
    words = re.sub(r"[^a-z0-9]+", " ", ocr_text.lower()).strip()
    if len(re.sub(r"\s", "", words)) < _MIN_MEANINGFUL_TEXT_CHARS:
        return ""
    return words[:_MAX_STORED_TEXT_CHARS]
