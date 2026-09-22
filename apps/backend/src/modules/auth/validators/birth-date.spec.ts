import { ValidationPipe } from '@nestjs/common';
import { IsOptional } from 'class-validator';

import { ageOn, IsPlausibleBirthDate, isPlausibleBirthDate, parseBirthDate } from './birth-date';

const NOW = new Date('2026-09-19T10:00:00.000Z');

describe('parseBirthDate', () => {
  it('reads a YYYY-MM-DD date as midnight UTC', () => {
    expect(parseBirthDate('1998-04-21')?.toISOString()).toBe('1998-04-21T00:00:00.000Z');
  });

  it.each([
    ['a day that does not exist', '2001-02-30'],
    ['month 13', '2001-13-01'],
    ['day 0', '2001-01-00'],
    ['29 February in a year that is not a leap year', '2001-02-29'],
    ['a different format', '21/04/1998'],
    ['a date with a time', '1998-04-21T00:00:00Z'],
    ['no leading zeros', '1998-4-1'],
    ['an empty string', ''],
    ['text', 'yesterday'],
  ])('rejects %s', (_label, value) => {
    expect(parseBirthDate(value)).toBeNull();
  });

  it('accepts 29 February in a leap year', () => {
    expect(parseBirthDate('2000-02-29')).not.toBeNull();
  });

  it.each([[null], [undefined], [19980421], [{}]])('rejects a value that is not text: %p', (value) => {
    expect(parseBirthDate(value)).toBeNull();
  });
});

describe('ageOn', () => {
  it('counts a birthday only once it has come', () => {
    const born = new Date('2000-09-20T00:00:00.000Z');
    expect(ageOn(born, new Date('2026-09-19T00:00:00.000Z'))).toBe(25);
    expect(ageOn(born, new Date('2026-09-20T00:00:00.000Z'))).toBe(26);
  });

  it('handles a birthday earlier in the year', () => {
    expect(ageOn(new Date('2000-01-01T00:00:00.000Z'), NOW)).toBe(26);
  });
});

describe('isPlausibleBirthDate', () => {
  it('accepts an adult', () => {
    expect(isPlausibleBirthDate('1998-04-21', NOW)).toBe(true);
  });

  it('accepts someone who turns 13 today, and refuses someone a day short', () => {
    expect(isPlausibleBirthDate('2013-09-19', NOW)).toBe(true);
    expect(isPlausibleBirthDate('2013-09-20', NOW)).toBe(false);
  });

  it('refuses a child', () => {
    expect(isPlausibleBirthDate('2020-01-01', NOW)).toBe(false);
  });

  it('refuses a date in the future', () => {
    expect(isPlausibleBirthDate('2027-01-01', NOW)).toBe(false);
  });

  it('refuses an age over 120, and accepts exactly 120', () => {
    expect(isPlausibleBirthDate('1900-01-01', NOW)).toBe(false);
    expect(isPlausibleBirthDate('1906-09-19', NOW)).toBe(true);
    expect(isPlausibleBirthDate('1906-09-18', NOW)).toBe(true);
    expect(isPlausibleBirthDate('1905-09-19', NOW)).toBe(false);
  });

  it('refuses something that is not a date at all', () => {
    expect(isPlausibleBirthDate('not a date', NOW)).toBe(false);
    expect(isPlausibleBirthDate(undefined, NOW)).toBe(false);
  });
});

describe('@IsPlausibleBirthDate', () => {
  class Body {
    @IsOptional()
    @IsPlausibleBirthDate()
    dateOfBirth?: string | null;
  }
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const run = (body: unknown) => pipe.transform(body, { type: 'body', metatype: Body });

  it('lets a good date, a missing date and an explicit null through', async () => {
    await expect(run({ dateOfBirth: '1998-04-21' })).resolves.toBeDefined();
    await expect(run({})).resolves.toBeDefined();
    await expect(run({ dateOfBirth: null })).resolves.toBeDefined();
  });

  it('rejects a bad date with a message that says what is wanted', async () => {
    await expect(run({ dateOfBirth: '2030-01-01' })).rejects.toMatchObject({
      response: { message: [expect.stringContaining('YYYY-MM-DD')] },
    });
  });
});
