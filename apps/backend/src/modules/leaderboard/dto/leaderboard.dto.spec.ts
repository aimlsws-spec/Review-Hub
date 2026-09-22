import { buildValidationPipe } from '@common/pipes/validation.pipe';

import { LeaderboardQueryDto } from './leaderboard-query.dto';
import { LeaderboardVisibilityDto } from './leaderboard-visibility.dto';

/** Runs a value through the same pipe the app uses, so the result is what a request would get. */
const validate = (type: new () => object, value: unknown) =>
  buildValidationPipe().transform(value, { type, metatype: type } as never);

describe('LeaderboardVisibilityDto', () => {
  it.each([true, false])('accepts %s', async (visible) => {
    await expect(validate(LeaderboardVisibilityDto, { visible })).resolves.toMatchObject({ visible });
  });

  it.each([['yes'], ['false'], ['true'], [1], [0], [null]])('refuses %j: the string "false" must not turn into true', async (visible) => {
    await expect(validate(LeaderboardVisibilityDto, { visible })).rejects.toMatchObject({ status: 422 });
  });

  it('refuses a missing value and fields it does not know', async () => {
    await expect(validate(LeaderboardVisibilityDto, {})).rejects.toMatchObject({ status: 422 });
    await expect(validate(LeaderboardVisibilityDto, { visible: true, extra: 1 })).rejects.toMatchObject({ status: 422 });
  });
});

describe('LeaderboardQueryDto', () => {
  it('defaults to this month and 20 people', async () => {
    await expect(validate(LeaderboardQueryDto, {})).resolves.toMatchObject({ period: 'month', limit: 20 });
  });

  it('takes the limit from a query string', async () => {
    await expect(validate(LeaderboardQueryDto, { period: 'all_time', limit: '50' })).resolves.toMatchObject({ period: 'all_time', limit: 50 });
  });

  it.each([{ period: 'week' }, { limit: '0' }, { limit: '51' }, { limit: 'abc' }, { limit: '2.5' }])('refuses %j', async (query) => {
    await expect(validate(LeaderboardQueryDto, query)).rejects.toMatchObject({ status: 422 });
  });
});
