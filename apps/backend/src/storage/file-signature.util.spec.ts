import { contentMatchesMimeType } from './file-signature.util';

const bytes = (...values: number[]) => Buffer.from(values);
const text = (value: string) => Buffer.from(value, 'latin1');

describe('contentMatchesMimeType', () => {
  it.each([
    ['image/jpeg', bytes(0xff, 0xd8, 0xff, 0xe0, 0x00)],
    ['image/png', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00)],
    ['image/gif', text('GIF89a....')],
    ['image/webp', text('RIFF\x00\x00\x00\x00WEBPVP8 ')],
    ['application/pdf', text('%PDF-1.7\n...')],
    ['application/pdf', text('\n\n%PDF-1.4')],
    ['video/mp4', text('\x00\x00\x00\x18ftypmp42')],
    ['video/quicktime', text('\x00\x00\x00\x14ftypqt  ')],
    ['video/quicktime', text('\x00\x00\x00\x08wide....')],
    ['video/x-msvideo', text('RIFF\x00\x00\x00\x00AVI LIST')],
    ['application/msword', bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', text('PK\x03\x04....')],
    ['application/zip', text('PK\x05\x06')],
    ['text/csv', text('name,amount\nA,10\n')],
  ])('accepts real %s content', (mimeType, buffer) => {
    expect(contentMatchesMimeType(buffer, mimeType)).toBe(true);
  });

  it('refuses a program labelled as an image', () => {
    expect(contentMatchesMimeType(text('MZ\x90\x00\x03\x00'), 'image/png')).toBe(false);
  });

  it('refuses an HTML page labelled as a PDF or an image', () => {
    const html = text('<html><script>alert(1)</script></html>');
    expect(contentMatchesMimeType(html, 'application/pdf')).toBe(false);
    expect(contentMatchesMimeType(html, 'image/jpeg')).toBe(false);
  });

  it('refuses binary content labelled as CSV', () => {
    expect(contentMatchesMimeType(bytes(0x4d, 0x5a, 0x00, 0x00), 'text/csv')).toBe(false);
  });

  it('refuses a WebP header that is really a WAV file', () => {
    expect(contentMatchesMimeType(text('RIFF\x00\x00\x00\x00WAVEfmt '), 'image/webp')).toBe(false);
  });

  it('refuses an empty file, a truncated header and a type it has no check for', () => {
    expect(contentMatchesMimeType(Buffer.alloc(0), 'text/csv')).toBe(false);
    expect(contentMatchesMimeType(bytes(0x89, 0x50), 'image/png')).toBe(false);
    expect(contentMatchesMimeType(text('<svg/>'), 'image/svg+xml')).toBe(false);
  });
});
