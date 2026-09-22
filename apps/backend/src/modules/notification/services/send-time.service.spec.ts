import { SMART_TIMING } from '../constants';
import { jitterMinutes } from '../utils/send-time.util';

import { SendTimeService } from './send-time.service';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const activity = (byHour: Record<number, number>) => Array.from({ length: 24 }, (_, hour) => byHour[hour] ?? 0);

describe('SendTimeService', () => {
  const activityRepository = { hourlyActivity: jest.fn() };
  let service: SendTimeService;

  // 2026-09-19 10:00 UTC = 15:30 in India.
  const now = new Date('2026-09-19T10:00:00.000Z');
  const target = (hour: number, userId: string) => {
    const wanted = Date.UTC(2026, 8, 19, hour, jitterMinutes(userId)) - SMART_TIMING.UTC_OFFSET_MINUTES * MIN;
    return wanted >= now.getTime() ? wanted - now.getTime() : wanted + DAY - now.getTime();
  };

  beforeEach(() => {
    jest.resetAllMocks();
    activityRepository.hourlyActivity.mockResolvedValue(new Map());
    service = new SendTimeService(activityRepository as never);
  });

  it('holds each person until the hour they are usually active', async () => {
    activityRepository.hourlyActivity.mockResolvedValue(
      new Map([
        ['u1', activity({ 20: 12, 9: 2 })],
        ['u2', activity({ 10: 8 })],
      ]),
    );

    const delays = await service.computeDelays(['u1', 'u2'], now);

    expect(delays.get('u1')).toBe(target(20, 'u1'));
    expect(delays.get('u2')).toBe(target(10, 'u2'));
  });

  it('uses the default evening hour for someone with too little history, or none', async () => {
    activityRepository.hourlyActivity.mockResolvedValue(new Map([['u1', activity({ 8: 1 })]]));

    const delays = await service.computeDelays(['u1', 'u2'], now);

    expect(delays.get('u1')).toBe(target(SMART_TIMING.DEFAULT_HOUR, 'u1'));
    expect(delays.get('u2')).toBe(target(SMART_TIMING.DEFAULT_HOUR, 'u2'));
  });

  it('gives every user a delay, and never a negative one or one over a day', async () => {
    const ids = Array.from({ length: 50 }, (_, i) => `user-${i}`);

    const delays = await service.computeDelays(ids, now);

    expect(delays.size).toBe(50);
    for (const delay of delays.values()) {
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThan(DAY);
    }
  });

  it('never lands in the night hours', async () => {
    const ids = Array.from({ length: 100 }, (_, i) => `user-${i}`);
    const delays = await service.computeDelays(ids, now);

    for (const delay of delays.values()) {
      const localHour = new Date(now.getTime() + delay + SMART_TIMING.UTC_OFFSET_MINUTES * MIN).getUTCHours();
      expect(localHour).toBeGreaterThanOrEqual(SMART_TIMING.EARLIEST_HOUR);
      expect(localHour).toBeLessThanOrEqual(SMART_TIMING.LATEST_HOUR);
    }
  });

  it('spreads people who share an hour instead of sending them all at once', async () => {
    const ids = Array.from({ length: 200 }, (_, i) => `user-${i}`);

    const delays = await service.computeDelays(ids, now);

    expect(new Set(delays.values()).size).toBeGreaterThan(40);
  });

  it('gives the same answer for the same person every time', async () => {
    const first = await service.computeDelays(['u1'], now);
    const second = await service.computeDelays(['u1'], now);

    expect(first.get('u1')).toBe(second.get('u1'));
  });

  it('still sends, at the default hour, when the history cannot be read', async () => {
    activityRepository.hourlyActivity.mockRejectedValue(new Error('db down'));

    const delays = await service.computeDelays(['u1'], now);

    expect(delays.get('u1')).toBe(target(SMART_TIMING.DEFAULT_HOUR, 'u1'));
  });

  it('reads the history for the whole page in one go, over the configured window', async () => {
    await service.computeDelays(['u1', 'u2', 'u3'], now);

    expect(activityRepository.hourlyActivity).toHaveBeenCalledTimes(1);
    expect(activityRepository.hourlyActivity).toHaveBeenCalledWith(
      ['u1', 'u2', 'u3'],
      new Date(now.getTime() - SMART_TIMING.LOOKBACK_DAYS * DAY),
      SMART_TIMING.UTC_OFFSET_MINUTES,
    );
  });
});
