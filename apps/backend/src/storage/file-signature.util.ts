/**
 * Checks that an upload's bytes really are the type its MIME type claims. The MIME type on a multipart upload is
 * whatever the client wrote in the form part's Content-Type, so a program or an HTML page can arrive labelled
 * `image/png`. Comparing the file's opening bytes (its "magic number") with the claimed type catches that, without a
 * dependency: the types accepted here are a short, fixed list.
 */

const startsWith = (buffer: Buffer, bytes: number[], offset = 0): boolean =>
  buffer.length >= offset + bytes.length && bytes.every((byte, i) => buffer[offset + i] === byte);

const ascii = (text: string): number[] => [...text].map((c) => c.charCodeAt(0));

const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** Old Office files (.doc, .xls) are OLE compound documents. */
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
/** .docx and .xlsx are zip archives, like .zip itself; an empty archive starts with the end-of-directory record. */
const ZIP_ENTRY = ascii('PK\x03\x04');
const ZIP_EMPTY = ascii('PK\x05\x06');
/** QuickTime files may open with any of these atoms instead of `ftyp`. */
const QUICKTIME_ATOMS = ['ftyp', 'moov', 'mdat', 'wide', 'free', 'skip', 'pnot'].map(ascii);

/** A PDF's header may follow a little junk, which readers tolerate; the spec allows it within the first 1 KB. */
const isPdf = (buffer: Buffer): boolean => buffer.subarray(0, 1024).includes('%PDF-');

const isZip = (buffer: Buffer): boolean => startsWith(buffer, ZIP_ENTRY) || startsWith(buffer, ZIP_EMPTY);

/** CSV has no signature. Plain text never contains a NUL byte, while executables and other binaries nearly always do. */
const isText = (buffer: Buffer): boolean => !buffer.subarray(0, 8192).includes(0);

const SIGNATURE_CHECKS: Record<string, (buffer: Buffer) => boolean> = {
  'image/jpeg': (b) => startsWith(b, JPEG),
  'image/png': (b) => startsWith(b, PNG),
  'image/gif': (b) => startsWith(b, ascii('GIF87a')) || startsWith(b, ascii('GIF89a')),
  'image/webp': (b) => startsWith(b, ascii('RIFF')) && startsWith(b, ascii('WEBP'), 8),
  'application/pdf': isPdf,
  'video/mp4': (b) => startsWith(b, ascii('ftyp'), 4),
  'video/quicktime': (b) => QUICKTIME_ATOMS.some((atom) => startsWith(b, atom, 4)),
  'video/x-msvideo': (b) => startsWith(b, ascii('RIFF')) && startsWith(b, ascii('AVI '), 8),
  'application/msword': (b) => startsWith(b, OLE),
  'application/vnd.ms-excel': (b) => startsWith(b, OLE),
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': isZip,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': isZip,
  'application/zip': isZip,
  'text/csv': isText,
};

/**
 * True when the bytes match the claimed MIME type. A type with no known signature is refused rather than waved
 * through, so adding a type to an upload allowlist also means adding its check here.
 */
export function contentMatchesMimeType(buffer: Buffer, mimeType: string): boolean {
  const check = SIGNATURE_CHECKS[mimeType];
  return !!check && buffer.length > 0 && check(buffer);
}
