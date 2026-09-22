import { isOlderThan, parseVersion } from './version.util';

describe('parseVersion', () => {
  it.each([
    ['1.4.2', [1, 4, 2]],
    ['1.4.2+7', [1, 4, 2]],
    ['1.4.2-beta.1', [1, 4, 2]],
    ['v2.0.10', [2, 0, 10]],
    ['  3.1.0  ', [3, 1, 0]],
  ])('reads %s as %j', (text, parsed) => {
    expect(parseVersion(text)).toEqual(parsed);
  });

  it.each(['', 'abc', '1', '1.2', '1.2.x', '1.2.3.4', '-1.2.3', '1.2.3 and more', undefined, null])('does not read %j as a version', (text) => {
    expect(parseVersion(text)).toBeNull();
  });
});

describe('isOlderThan', () => {
  it.each([
    ['1.0.0', '1.0.1'],
    ['1.0.9', '1.1.0'],
    ['1.9.9', '2.0.0'],
    ['0.9.9', '1.0.0'],
    ['1.2.3', '1.2.10'],
  ])('%s is older than %s', (version, minimum) => {
    expect(isOlderThan(version, minimum)).toBe(true);
  });

  it.each([
    ['1.0.0', '1.0.0'],
    ['1.0.1', '1.0.0'],
    ['2.0.0', '1.9.9'],
    ['1.2.10', '1.2.3'],
    ['1.0.0+5', '1.0.0'],
  ])('%s is not older than %s', (version, minimum) => {
    expect(isOlderThan(version, minimum)).toBe(false);
  });

  it('compares numbers, not text: 1.10.0 is newer than 1.9.0', () => {
    expect(isOlderThan('1.10.0', '1.9.0')).toBe(false);
    expect(isOlderThan('1.9.0', '1.10.0')).toBe(true);
  });

  it.each([
    ['garbage', '1.0.0'],
    ['1.0.0', 'garbage'],
    [undefined, '1.0.0'],
    ['1.0.0', undefined],
    ['', '1.0.0'],
  ])('is never true when either side is not a version (%j, %j): nobody is locked out over an unreadable value', (version, minimum) => {
    expect(isOlderThan(version, minimum)).toBe(false);
  });
});
