import { ValidationPipe } from '@nestjs/common';

import { StatesQueryDto } from '../../location/dto/location.dto';

import { RegisterDto } from './register.dto';
import { UpdateProfileDto } from './update-profile.dto';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const validate = <T>(metatype: new () => T, value: unknown) => pipe.transform(value, { type: 'body', metatype });

const STATE = '6f1c3c9e-3f6a-4c55-9a55-2f0d5f0b7a11';
const CITY = '0b9c5f5e-7a0e-4d4b-8d9e-5a1b8e1d2c22';
const registration = { firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'Pass@123' };

describe('demographics on RegisterDto and UpdateProfileDto', () => {
  it.each([
    ['RegisterDto', RegisterDto, registration],
    ['UpdateProfileDto', UpdateProfileDto, {}],
  ])('%s: everything stays optional', async (_name, dto, base) => {
    await expect(validate(dto as never, base)).resolves.toBeDefined();
  });

  it.each([
    ['RegisterDto', RegisterDto, registration],
    ['UpdateProfileDto', UpdateProfileDto, {}],
  ])('%s: accepts a full set of details', async (_name, dto, base) => {
    await expect(
      validate(dto as never, { ...base, dateOfBirth: '1998-04-21', gender: 'FEMALE', stateId: STATE, cityId: CITY }),
    ).resolves.toMatchObject({ dateOfBirth: '1998-04-21', gender: 'FEMALE', stateId: STATE, cityId: CITY });
  });

  it('accepts null on a profile update, which removes what was saved', async () => {
    await expect(validate(UpdateProfileDto, { dateOfBirth: null, gender: null, stateId: null, cityId: null })).resolves.toBeDefined();
  });

  it.each([
    ['a child', { dateOfBirth: '2020-01-01' }],
    ['a date in the future', { dateOfBirth: '2999-01-01' }],
    ['a date that does not exist', { dateOfBirth: '2001-02-30' }],
    ['a date in the wrong format', { dateOfBirth: '21-04-1998' }],
    ['ALL as a gender, which is for campaigns only', { gender: 'ALL' }],
    ['a made-up gender', { gender: 'ROBOT' }],
    ['a state id that is not a UUID', { stateId: 'gujarat' }],
    ['a city id that is not a UUID', { cityId: '123' }],
    ['a country id, which the server works out itself', { countryId: STATE }],
  ])('rejects %s', async (_label, body) => {
    await expect(validate(UpdateProfileDto, body)).rejects.toBeDefined();
  });
});

describe('StatesQueryDto', () => {
  it('accepts no country, and a two-letter one in either case', async () => {
    await expect(validate(StatesQueryDto, {})).resolves.toBeDefined();
    await expect(validate(StatesQueryDto, { countryCode: 'in' })).resolves.toMatchObject({ countryCode: 'IN' });
  });

  it.each([['INDIA'], ['I'], ['1N'], ['']])('rejects %p', async (countryCode) => {
    await expect(validate(StatesQueryDto, { countryCode })).rejects.toBeDefined();
  });
});
