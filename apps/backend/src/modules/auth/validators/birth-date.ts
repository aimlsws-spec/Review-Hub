import { registerDecorator, ValidationOptions } from 'class-validator';

import { MAX_USER_AGE, MIN_USER_AGE } from '../constants';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Reads a `YYYY-MM-DD` string as a date at midnight UTC. Returns null for anything else, including a day that does
 * not exist such as 2001-02-30, which `new Date()` would quietly roll over to March.
 */
export function parseBirthDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const match = DATE_ONLY.exec(value);
  if (!match) return null;

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDay = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isRealDay ? date : null;
}

/** Whole years between a birth date and `now`, counting a birthday only once it has passed. */
export function ageOn(birthDate: Date, now: Date): number {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayPassed =
    now.getUTCMonth() > birthDate.getUTCMonth() ||
    (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() >= birthDate.getUTCDate());
  if (!birthdayPassed) age -= 1;
  return age;
}

/** A real date that is not in the future and gives an age between the minimum and maximum allowed. */
export function isPlausibleBirthDate(value: unknown, now: Date = new Date()): boolean {
  const date = parseBirthDate(value);
  if (!date || date.getTime() > now.getTime()) return false;
  const age = ageOn(date, now);
  return age >= MIN_USER_AGE && age <= MAX_USER_AGE;
}

/** Validates a `YYYY-MM-DD` date of birth: a real date, not in the future, and a person aged 13 to 120. */
export function IsPlausibleBirthDate(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isPlausibleBirthDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value: unknown): boolean => isPlausibleBirthDate(value),
        defaultMessage: (): string =>
          `Date of birth must be a real date as YYYY-MM-DD, not in the future, for someone aged ${MIN_USER_AGE} to ${MAX_USER_AGE}`,
      },
    });
  };
}
