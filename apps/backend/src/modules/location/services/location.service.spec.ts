import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { LocationService } from './location.service';

describe('LocationService', () => {
  const repository = { listStates: jest.fn(), listCities: jest.fn(), findState: jest.fn(), findCity: jest.fn() };
  let service: LocationService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new LocationService(repository as never);
  });

  describe('listStates', () => {
    it('lists Indian states when no country is given', async () => {
      repository.listStates.mockResolvedValue([{ id: 's1', name: 'Gujarat', code: 'GJ' }]);

      await expect(service.listStates()).resolves.toEqual([{ id: 's1', name: 'Gujarat', code: 'GJ' }]);
      expect(repository.listStates).toHaveBeenCalledWith('IN');
    });

    it('uses the country asked for, in capitals', async () => {
      repository.listStates.mockResolvedValue([]);

      await service.listStates('us');

      expect(repository.listStates).toHaveBeenCalledWith('US');
    });
  });

  describe('listCities', () => {
    it('lists the cities of a state that exists', async () => {
      repository.findState.mockResolvedValue({ id: 's1', name: 'Gujarat', countryId: 'c1' });
      repository.listCities.mockResolvedValue([{ id: 'city1', name: 'Ahmedabad' }]);

      await expect(service.listCities('s1')).resolves.toEqual([{ id: 'city1', name: 'Ahmedabad' }]);
    });

    it('says the state was not found rather than returning an empty list for a state that does not exist', async () => {
      repository.findState.mockResolvedValue(null);

      await expect(service.listCities('nope')).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.listCities).not.toHaveBeenCalled();
    });
  });

  describe('findState', () => {
    it('returns the ids, or null', async () => {
      repository.findState.mockResolvedValueOnce({ id: 's1', name: 'Gujarat', countryId: 'c1' }).mockResolvedValueOnce(null);

      await expect(service.findState('s1')).resolves.toEqual({ id: 's1', countryId: 'c1' });
      await expect(service.findState('nope')).resolves.toBeNull();
    });
  });

  describe('findCity', () => {
    it('returns the city with its state and country', async () => {
      repository.findCity.mockResolvedValue({ id: 'city1', name: 'Ahmedabad', stateId: 's1', state: { countryId: 'c1' } });

      await expect(service.findCity('city1')).resolves.toEqual({ id: 'city1', stateId: 's1', countryId: 'c1' });
    });

    it('returns null for a city that is missing or switched off', async () => {
      repository.findCity.mockResolvedValue(null);

      await expect(service.findCity('nope')).resolves.toBeNull();
    });
  });
});
