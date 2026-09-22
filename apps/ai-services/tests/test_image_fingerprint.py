import io
import random

from PIL import Image, ImageDraw

from src.engines.image_fingerprint import dhash, normalize_evidence_text


def _scene(seed: int, size: tuple[int, int] = (640, 480)) -> Image.Image:
    """A repeatable picture with real structure (shapes and a gradient), standing in for a photo."""
    rng = random.Random(seed)
    image = Image.new("RGB", size)
    draw = ImageDraw.Draw(image)
    for y in range(size[1]):
        shade = int(255 * y / size[1])
        draw.line([(0, y), (size[0], y)], fill=(shade, 255 - shade, (shade * 2) % 256))
    for _ in range(25):
        x0, y0 = rng.randrange(size[0] - 40), rng.randrange(size[1] - 40)
        x1, y1 = x0 + rng.randrange(20, 200), y0 + rng.randrange(20, 160)
        draw.rectangle([x0, y0, x1, y1], fill=tuple(rng.randrange(256) for _ in range(3)))
    return image


def _encode(image: Image.Image, fmt: str = "PNG", **options) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format=fmt, **options)
    return buffer.getvalue()


def _distance(a: str, b: str) -> int:
    return bin(int(a, 16) ^ int(b, 16)).count("1")


def test_hash_is_sixteen_lowercase_hex_characters():
    value = dhash(_encode(_scene(1)))
    assert value is not None
    assert len(value) == 16
    assert value == value.lower()
    int(value, 16)  # valid hex


def test_same_picture_always_gets_the_same_hash():
    picture = _encode(_scene(1))
    assert dhash(picture) == dhash(picture)


def test_recompressing_as_jpeg_barely_changes_the_hash():
    original = _scene(1)
    recompressed = _encode(original, "JPEG", quality=55)
    assert _distance(dhash(_encode(original)), dhash(recompressed)) <= 6


def test_resizing_barely_changes_the_hash():
    original = _scene(1)
    smaller = original.resize((320, 240), Image.Resampling.LANCZOS)
    assert _distance(dhash(_encode(original)), dhash(_encode(smaller))) <= 6


def test_a_screenshot_of_a_slightly_brighter_copy_barely_changes_the_hash():
    original = _scene(1)
    brighter = Image.eval(original, lambda v: min(255, v + 12))
    assert _distance(dhash(_encode(original)), dhash(_encode(brighter))) <= 6


def test_a_photo_saved_sideways_with_an_exif_flag_hashes_like_the_upright_one():
    upright = _scene(1)
    # A phone stores this rotated 90 degrees and asks viewers to turn it back via EXIF orientation 6.
    exif = Image.Exif()
    exif[0x0112] = 6
    sideways = upright.rotate(90, expand=True)
    assert _distance(dhash(_encode(upright.rotate(0))), dhash(_encode(sideways, "JPEG", exif=exif))) <= 10


def test_different_pictures_get_very_different_hashes():
    distances = [_distance(dhash(_encode(_scene(1))), dhash(_encode(_scene(seed)))) for seed in (2, 3, 4, 5, 6)]
    assert min(distances) > 12


def test_a_flat_image_has_no_fingerprint_so_blank_images_never_match_each_other():
    assert dhash(_encode(Image.new("RGB", (400, 400), "white"))) is None
    assert dhash(_encode(Image.new("RGB", (400, 400), (12, 90, 200)))) is None


def test_a_tiny_image_has_no_fingerprint():
    checkerboard = Image.new("RGB", (10, 10))
    checkerboard.putdata([(255, 255, 255) if (x + y) % 2 else (0, 0, 0) for y in range(10) for x in range(10)])
    assert dhash(_encode(checkerboard)) is None


def test_bytes_that_are_not_an_image_have_no_fingerprint():
    assert dhash(b"not an image at all") is None
    assert dhash(b"") is None
    assert dhash(b"\x00\x00\x00\x18ftypmp42") is None  # the start of an MP4 video


def test_a_truncated_image_has_no_fingerprint_instead_of_raising():
    assert dhash(_encode(_scene(1))[:200]) is None


def test_gif_and_webp_are_supported():
    picture = _scene(1)
    png = dhash(_encode(picture))
    assert _distance(png, dhash(_encode(picture, "WEBP", quality=90))) <= 6
    assert _distance(png, dhash(_encode(picture.convert("P"), "GIF"))) <= 8


class TestNormalizeEvidenceText:
    def test_none_means_ocr_did_not_run(self):
        assert normalize_evidence_text(None) is None

    def test_too_little_text_means_a_photo(self):
        assert normalize_evidence_text("") == ""
        assert normalize_evidence_text("   \n  ") == ""
        assert normalize_evidence_text("Hi! 12") == ""

    def test_readable_text_is_reduced_to_lowercase_words(self):
        text = "  Followed  @Priya_Sharma!!\nInstagram — 1,204 followers  "
        assert normalize_evidence_text(text) == "followed priya sharma instagram 1 204 followers"

    def test_the_same_screen_read_twice_with_different_line_breaks_normalises_identically(self):
        a = normalize_evidence_text("You are following\nviralkar_official on Instagram today")
        b = normalize_evidence_text("You are   following viralkar_official\non Instagram   today")
        assert a == b

    def test_stored_text_is_capped(self):
        assert len(normalize_evidence_text("word " * 1000)) <= 1000
