import { Prisma } from '@prisma/client';

import { UserActivityRepository } from './user-activity.repository';

describe('UserActivityRepository', () => {
  const prisma = { $queryRaw: jest.fn() };
  let repository: UserActivityRepository;
  const since = new Date('2026-07-01T00:00:00.000Z');

  beforeEach(() => {
    jest.resetAllMocks();
    repository = new UserActivityRepository(prisma as never);
  });

  it('does not query for an empty list of users', async () => {
    const result = await repository.hourlyActivity([], since, 330);

    expect(result.size).toBe(0);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('turns the rows into 24 counts per user, adding up hours reported more than once', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { userId: 'u1', hourOfDay: 20, activities: 7n },
      { userId: 'u1', hourOfDay: 9, activities: 2 },
      { userId: 'u1', hourOfDay: 20, activities: 1n },
      { userId: 'u2', hourOfDay: 0, activities: 4n },
    ]);

    const result = await repository.hourlyActivity(['u1', 'u2'], since, 330);

    const u1 = result.get('u1') as number[];
    expect(u1).toHaveLength(24);
    expect(u1[20]).toBe(8);
    expect(u1[9]).toBe(2);
    expect(u1.reduce((a, b) => a + b, 0)).toBe(10);
    expect((result.get('u2') as number[])[0]).toBe(4);
  });

  it('leaves out users with no activity, and ignores an hour that is not a real hour', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { userId: 'u1', hourOfDay: 25, activities: 3 },
      { userId: 'u1', hourOfDay: null, activities: 3 },
    ]);

    const result = await repository.hourlyActivity(['u1', 'u2'], since, 330);

    expect(result.size).toBe(0);
  });

  it('runs one query for the whole page, with the users, the start date and the offset as parameters', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await repository.hourlyActivity(['u1', 'u2'], since, 330);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const sql = prisma.$queryRaw.mock.calls[0][0] as Prisma.Sql;
    expect(sql.values).toEqual(expect.arrayContaining(['+05:30', since, 'u1', 'u2']));
    // Values are bound, never pasted into the text of the query.
    expect(sql.sql).not.toContain('u1');
    expect(sql.sql).not.toContain('05:30');
  });

  it('reads logins, opened notifications and task submissions, and ignores failed logins and deleted submissions', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await repository.hourlyActivity(['u1'], since, 330);

    const text = (prisma.$queryRaw.mock.calls[0][0] as Prisma.Sql).sql;
    expect(text).toContain('login_history');
    expect(text).toContain('isSuccess = 1');
    expect(text).toContain('notifications');
    expect(text).toContain('readAt IS NOT NULL');
    expect(text).toContain('task_submissions');
    expect(text).toContain('deletedAt IS NULL');
  });
});
