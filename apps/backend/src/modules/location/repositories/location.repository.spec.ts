import { LocationRepository } from './location.repository';

describe('LocationRepository', () => {
  const prisma = {
    state: { findMany: jest.fn(), findFirst: jest.fn() },
    city: { findMany: jest.fn(), findFirst: jest.fn() },
  };
  let repository: LocationRepository;

  beforeEach(() => {
    jest.resetAllMocks();
    repository = new LocationRepository(prisma as never);
  });

  it('lists only active states of an active country, in name order', async () => {
    await repository.listStates('IN');

    expect(prisma.state.findMany).toHaveBeenCalledWith({
      where: { isActive: true, country: { code: 'IN', isActive: true } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
  });

  it('lists only active cities of the state, in name order', async () => {
    await repository.listCities('s1');

    expect(prisma.city.findMany).toHaveBeenCalledWith({
      where: { stateId: 's1', isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  });

  it('only finds a state that is active and in an active country', async () => {
    await repository.findState('s1');

    expect(prisma.state.findFirst.mock.calls[0][0].where).toEqual({ id: 's1', isActive: true, country: { isActive: true } });
  });

  it('only finds a city that is active, in an active state, in an active country', async () => {
    await repository.findCity('c1');

    expect(prisma.city.findFirst.mock.calls[0][0].where).toEqual({
      id: 'c1',
      isActive: true,
      state: { isActive: true, country: { isActive: true } },
    });
  });
});
