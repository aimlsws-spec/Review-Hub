import { LeaderboardService, toDisplayName } from './leaderboard.service';

describe('toDisplayName', () => {
  it.each([
    ['Priya', 'Sharma', 'Priya S.'],
    ['  Priya ', ' sharma ', 'Priya S.'],
    ['Priya', '', 'Priya'],
    ['', 'Sharma', 'S.'],
    ['', '', 'Member'],
    ['પ્રિયા', 'શાહ', 'પ્રિયા શ.'],
    ['Zoë', 'Élan', 'Zoë É.'],
  ])('shows %j %j as %j: only a first name and an initial ever leave the server', (first, last, shown) => {
    expect(toDisplayName(first, last)).toBe(shown);
  });

  it('never includes the rest of the last name', () => {
    expect(toDisplayName('Priya', 'Sharma')).not.toContain('harma');
  });
});

describe('LeaderboardService', () => {
  const repository = {
    topEarners: jest.fn(),
    findProfiles: jest.fn(),
    totalFor: jest.fn(),
    countEarningMoreThan: jest.fn(),
    isHidden: jest.fn(),
    setHidden: jest.fn(),
  };
  let service: LeaderboardService;

  const profile = (id: string, first = id, last = 'Test') => ({ id, firstName: first, lastName: last, avatarUrl: null });
  const query = (period: 'month' | 'all_time' = 'month', limit = 20) => ({ period, limit });

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findProfiles.mockImplementation(async (ids: string[]) => ids.map((id) => profile(id)));
    service = new LeaderboardService(repository as never);
  });

  describe('the list', () => {
    it('ranks people in the order the database gave, with names shortened and no ids', async () => {
      repository.topEarners.mockResolvedValue([
        { userId: 'u-1', totalEarned: 900 },
        { userId: 'u-2', totalEarned: 400.5 },
      ]);
      repository.findProfiles.mockResolvedValue([profile('u-1', 'Asha', 'Patel'), profile('u-2', 'Ravi', 'Kumar')]);

      const view = await service.view('viewer', query());

      expect(view.entries).toEqual([
        { rank: 1, displayName: 'Asha P.', avatarUrl: null, totalEarned: 900, isMe: false },
        { rank: 2, displayName: 'Ravi K.', avatarUrl: null, totalEarned: 400.5, isMe: false },
      ]);
      expect(JSON.stringify(view)).not.toMatch(/u-1|u-2/);
    });

    it('gives people on the same total the same rank, and skips a rank after a tie', async () => {
      repository.topEarners.mockResolvedValue([
        { userId: 'a', totalEarned: 500 },
        { userId: 'b', totalEarned: 500 },
        { userId: 'c', totalEarned: 500 },
        { userId: 'd', totalEarned: 100 },
      ]);

      const view = await service.view('viewer', query());

      expect(view.entries.map((entry) => entry.rank)).toEqual([1, 1, 1, 4]);
    });

    it('keeps a tie’s rank right even when someone in the middle of it is dropped', async () => {
      repository.topEarners.mockResolvedValue([
        { userId: 'a', totalEarned: 500 },
        { userId: 'gone', totalEarned: 500 },
        { userId: 'c', totalEarned: 500 },
        { userId: 'd', totalEarned: 100 },
      ]);
      repository.findProfiles.mockResolvedValue([profile('a'), profile('c'), profile('d')]);

      const view = await service.view('viewer', query());

      expect(view.entries.map((entry) => entry.rank)).toEqual([1, 1, 4]);
    });

    it('marks the viewer’s own row, and takes their standing from the list without asking again', async () => {
      repository.topEarners.mockResolvedValue([
        { userId: 'a', totalEarned: 900 },
        { userId: 'viewer', totalEarned: 300 },
      ]);

      const view = await service.view('viewer', query());

      expect(view.entries.map((entry) => entry.isMe)).toEqual([false, true]);
      expect(view.me).toEqual({ visible: true, rank: 2, totalEarned: 300 });
      expect(repository.totalFor).not.toHaveBeenCalled();
      expect(repository.isHidden).not.toHaveBeenCalled();
    });

    it('is empty, not an error, when nobody has earned anything yet', async () => {
      repository.topEarners.mockResolvedValue([]);
      repository.isHidden.mockResolvedValue(false);
      repository.totalFor.mockResolvedValue(0);

      const view = await service.view('viewer', query());

      expect(view.entries).toEqual([]);
      expect(view.me).toEqual({ visible: true, rank: null, totalEarned: 0 });
    });
  });

  describe('where the viewer stands when they are not in the list', () => {
    beforeEach(() => repository.topEarners.mockResolvedValue([{ userId: 'a', totalEarned: 900 }]));

    it('is one place behind everyone who earned more', async () => {
      repository.isHidden.mockResolvedValue(false);
      repository.totalFor.mockResolvedValue(120);
      repository.countEarningMoreThan.mockResolvedValue(41);

      const { me } = await service.view('viewer', query());

      expect(me).toEqual({ visible: true, rank: 42, totalEarned: 120 });
      expect(repository.countEarningMoreThan).toHaveBeenCalledWith(120, expect.anything());
    });

    it('is unranked with nothing earned in the period, without counting anyone', async () => {
      repository.isHidden.mockResolvedValue(false);
      repository.totalFor.mockResolvedValue(0);

      const { me } = await service.view('viewer', query());

      expect(me).toEqual({ visible: true, rank: null, totalEarned: 0 });
      expect(repository.countEarningMoreThan).not.toHaveBeenCalled();
    });

    it('says the viewer is hidden, and does not reveal or rank them', async () => {
      repository.isHidden.mockResolvedValue(true);

      const { me } = await service.view('viewer', query());

      expect(me).toEqual({ visible: false, rank: null, totalEarned: 0 });
      expect(repository.totalFor).not.toHaveBeenCalled();
    });
  });

  describe('the period', () => {
    beforeEach(() => repository.topEarners.mockResolvedValue([]));

    it('uses the current India month, and says when it starts over', async () => {
      repository.isHidden.mockResolvedValue(false);
      repository.totalFor.mockResolvedValue(0);

      const view = await service.view('viewer', query('month'));
      const range = repository.topEarners.mock.calls[0][0];

      expect(range.start.getTime()).toBeLessThanOrEqual(Date.now());
      expect(range.end.getTime()).toBeGreaterThan(Date.now());
      expect(view.resetsAt).toEqual(range.end);
    });

    it('has no window and no reset for the all-time board', async () => {
      repository.isHidden.mockResolvedValue(false);
      repository.totalFor.mockResolvedValue(0);

      const view = await service.view('viewer', query('all_time'));

      expect(repository.topEarners).toHaveBeenCalledWith(null, 20);
      expect(view.resetsAt).toBeNull();
    });

    it('passes the limit on', async () => {
      repository.isHidden.mockResolvedValue(false);
      repository.totalFor.mockResolvedValue(0);

      await service.view('viewer', query('month', 5));

      expect(repository.topEarners).toHaveBeenCalledWith(expect.anything(), 5);
    });
  });

  describe('visibility', () => {
    it('hides a person when they turn it off, and shows them when they turn it on', async () => {
      await expect(service.setVisibility('u-1', false)).resolves.toEqual({ visible: false });
      expect(repository.setHidden).toHaveBeenLastCalledWith('u-1', true);

      await expect(service.setVisibility('u-1', true)).resolves.toEqual({ visible: true });
      expect(repository.setHidden).toHaveBeenLastCalledWith('u-1', false);
    });
  });
});
