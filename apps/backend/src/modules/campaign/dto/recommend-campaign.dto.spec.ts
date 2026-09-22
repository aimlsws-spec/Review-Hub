import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CampaignGoal } from '../constants';

import { RecommendCampaignDto } from './recommend-campaign.dto';

const check = async (input: Record<string, unknown>) => validate(plainToInstance(RecommendCampaignDto, input));

describe('RecommendCampaignDto', () => {
  it('accepts a goal and a budget', async () => {
    expect(await check({ goal: CampaignGoal.MORE_REVIEWS, budget: 5000 })).toHaveLength(0);
  });

  it('accepts a budget sent as a string', async () => {
    expect(await check({ goal: CampaignGoal.MORE_REVIEWS, budget: '2500' })).toHaveLength(0);
  });

  it.each([
    ['unknown goal', { goal: 'WORLD_DOMINATION', budget: 5000 }],
    ['missing goal', { budget: 5000 }],
    ['budget below the minimum', { goal: CampaignGoal.MORE_REVIEWS, budget: 50 }],
    ['budget above the maximum', { goal: CampaignGoal.MORE_REVIEWS, budget: 5_000_000 }],
    ['budget that is not a number', { goal: CampaignGoal.MORE_REVIEWS, budget: 'lots' }],
    ['duration of zero days', { goal: CampaignGoal.MORE_REVIEWS, budget: 5000, durationDays: 0 }],
    ['duration over 90 days', { goal: CampaignGoal.MORE_REVIEWS, budget: 5000, durationDays: 91 }],
    ['highlight over 200 characters', { goal: CampaignGoal.MORE_REVIEWS, budget: 5000, highlight: 'x'.repeat(201) }],
    ['start date that is not a date', { goal: CampaignGoal.MORE_REVIEWS, budget: 5000, startAt: 'tomorrow' }],
  ])('rejects %s', async (_name, input) => {
    expect((await check(input)).length).toBeGreaterThan(0);
  });

  it('trims the highlight', () => {
    const dto = plainToInstance(RecommendCampaignDto, { goal: CampaignGoal.MORE_REVIEWS, budget: 5000, highlight: '  Free tea  ' });
    expect(dto.highlight).toBe('Free tea');
  });
});
