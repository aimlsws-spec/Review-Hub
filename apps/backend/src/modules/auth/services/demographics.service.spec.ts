import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { DemographicsService } from './demographics.service';

describe('DemographicsService', () => {
  const locationService = { findState: jest.fn(), findCity: jest.fn() };
  let service: DemographicsService;

  const gujarat = { id: 'state-gj', countryId: 'country-in' };
  const ahmedabad = { id: 'city-amd', stateId: 'state-gj', countryId: 'country-in' };

  beforeEach(() => {
    jest.resetAllMocks();
    locationService.findState.mockImplementation(async (id: string) => (id === gujarat.id ? gujarat : null));
    locationService.findCity.mockImplementation(async (id: string) => (id === ahmedabad.id ? ahmedabad : null));
    service = new DemographicsService(locationService as never);
  });

  describe('nothing to change', () => {
    it('writes nothing and looks nothing up', async () => {
      const result = await service.resolve({});

      expect(result).toEqual({ data: {}, changed: {} });
      expect(locationService.findState).not.toHaveBeenCalled();
      expect(locationService.findCity).not.toHaveBeenCalled();
    });
  });

  describe('date of birth', () => {
    it('is saved as a date at midnight UTC', async () => {
      const { data, changed } = await service.resolve({ dateOfBirth: '1998-04-21' });

      expect(data.dateOfBirth?.toISOString()).toBe('1998-04-21T00:00:00.000Z');
      expect(changed).toEqual({ dateOfBirth: 'updated' });
    });

    it('can be removed with null', async () => {
      const { data, changed } = await service.resolve({ dateOfBirth: null });

      expect(data).toEqual({ dateOfBirth: null });
      expect(changed).toEqual({ dateOfBirth: 'cleared' });
    });

    it.each([['2001-02-30'], ['2099-01-01'], ['2020-01-01'], ['garbage']])('refuses %s even if it got past the request check', async (value) => {
      await expect(service.resolve({ dateOfBirth: value })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('gender', () => {
    it('is saved, and can be removed with null', async () => {
      expect((await service.resolve({ gender: 'FEMALE' })).data).toEqual({ gender: 'FEMALE' });
      const cleared = await service.resolve({ gender: null });
      expect(cleared.data).toEqual({ gender: null });
      expect(cleared.changed).toEqual({ gender: 'cleared' });
    });
  });

  describe('location', () => {
    it('one chosen city fixes the city, its state and its country', async () => {
      const { data, changed } = await service.resolve({ cityId: ahmedabad.id });

      expect(data).toEqual({ countryId: 'country-in', stateId: 'state-gj', cityId: 'city-amd' });
      expect(changed).toEqual({ location: 'updated' });
    });

    it('accepts a city together with the state it is really in', async () => {
      const { data } = await service.resolve({ stateId: gujarat.id, cityId: ahmedabad.id });
      expect(data.cityId).toBe('city-amd');
    });

    it('refuses a city that is not in the chosen state', async () => {
      locationService.findState.mockResolvedValue({ id: 'state-mh', countryId: 'country-in' });

      await expect(service.resolve({ stateId: 'state-mh', cityId: ahmedabad.id })).rejects.toThrow('That city is not in the chosen state');
    });

    it('refuses a city that does not exist or is switched off', async () => {
      await expect(service.resolve({ cityId: 'city-nowhere' })).rejects.toThrow('That city was not found');
    });

    it('refuses a city while clearing the state', async () => {
      await expect(service.resolve({ stateId: null, cityId: ahmedabad.id })).rejects.toThrow('Choose a state');
    });

    it('a state alone sets the state and the country', async () => {
      const { data } = await service.resolve({ stateId: gujarat.id }, { stateId: gujarat.id });

      expect(data).toEqual({ countryId: 'country-in', stateId: 'state-gj' });
    });

    it('keeps the saved city when the same state is chosen again', async () => {
      const { data } = await service.resolve({ stateId: gujarat.id }, { stateId: gujarat.id });
      expect(data).not.toHaveProperty('cityId');
    });

    it('drops the saved city when a different state is chosen, since the old city is not in it', async () => {
      const { data } = await service.resolve({ stateId: gujarat.id }, { stateId: 'state-mh' });
      expect(data.cityId).toBeNull();
    });

    it('drops the saved city when a state is chosen for someone who had no state', async () => {
      const { data } = await service.resolve({ stateId: gujarat.id }, {});
      expect(data.cityId).toBeNull();
    });

    it('refuses a state that does not exist', async () => {
      await expect(service.resolve({ stateId: 'state-nowhere' })).rejects.toThrow('That state was not found');
    });

    it('clearing the state clears the city and country too', async () => {
      const { data, changed } = await service.resolve({ stateId: null });

      expect(data).toEqual({ countryId: null, stateId: null, cityId: null });
      expect(changed).toEqual({ location: 'cleared' });
    });

    it('clearing only the city keeps the state', async () => {
      const { data, changed } = await service.resolve({ cityId: null });

      expect(data).toEqual({ cityId: null });
      expect(changed).toEqual({ location: 'updated' });
    });

    it('can change everything at once', async () => {
      const { data, changed } = await service.resolve({ dateOfBirth: '1998-04-21', gender: 'MALE', cityId: ahmedabad.id });

      expect(data).toMatchObject({ gender: 'MALE', cityId: 'city-amd', stateId: 'state-gj', countryId: 'country-in' });
      expect(changed).toEqual({ dateOfBirth: 'updated', gender: 'updated', location: 'updated' });
    });
  });

  it('never puts a value in the change summary, only whether it changed', async () => {
    const { changed } = await service.resolve({ dateOfBirth: '1998-04-21', gender: 'MALE', cityId: ahmedabad.id });

    expect(JSON.stringify(changed)).not.toContain('1998');
    expect(JSON.stringify(changed)).not.toContain('MALE');
    expect(JSON.stringify(changed)).not.toContain('city-amd');
  });
});
