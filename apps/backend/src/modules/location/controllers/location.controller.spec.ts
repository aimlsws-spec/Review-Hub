import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';

import { LocationController } from './location.controller';

describe('LocationController', () => {
  const locationService = { listStates: jest.fn(), listCities: jest.fn() };
  let controller: LocationController;

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new LocationController(locationService as never);
  });

  it('lists states for the country in the query', async () => {
    locationService.listStates.mockResolvedValue([{ id: 's1', name: 'Gujarat', code: 'GJ' }]);

    await expect(controller.states({ countryCode: 'IN' })).resolves.toEqual([{ id: 's1', name: 'Gujarat', code: 'GJ' }]);
    expect(locationService.listStates).toHaveBeenCalledWith('IN');
  });

  it('lets the service pick the default country when none is given', async () => {
    await controller.states({});
    expect(locationService.listStates).toHaveBeenCalledWith(undefined);
  });

  it('lists the cities of a state', async () => {
    locationService.listCities.mockResolvedValue([{ id: 'c1', name: 'Ahmedabad' }]);

    await expect(controller.cities('state-1')).resolves.toEqual([{ id: 'c1', name: 'Ahmedabad' }]);
    expect(locationService.listCities).toHaveBeenCalledWith('state-1');
  });

  it('is public, because sign-up needs the lists before an account exists', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, LocationController.prototype.states)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, LocationController.prototype.cities)).toBe(true);
  });

  it('lets the answer be cached for an hour', () => {
    expect(Reflect.getMetadata('__headers__', LocationController.prototype.states)).toEqual([{ name: 'Cache-Control', value: 'public, max-age=3600' }]);
  });
});
