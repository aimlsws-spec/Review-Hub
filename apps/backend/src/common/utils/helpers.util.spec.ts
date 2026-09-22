import { maskIdentifier, maskPhone } from './helpers.util';

describe('maskIdentifier', () => {
  it('keeps only the last 4 characters of a PAN or Aadhaar number', () => {
    expect(maskIdentifier('ABCDE1234F')).toBe('****234F');
    expect(maskIdentifier('123456789012')).toBe('****9012');
  });

  it('hides values too short to reveal any part of', () => {
    expect(maskIdentifier('123')).toBe('****');
  });

  it('is what maskPhone uses, so both mask the same way', () => {
    expect(maskPhone('9876543210')).toBe(maskIdentifier('9876543210'));
    expect(maskPhone('9876543210')).toBe('****3210');
  });
});
