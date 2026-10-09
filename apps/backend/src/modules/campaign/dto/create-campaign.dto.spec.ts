import { ValidationPipe } from '@nestjs/common';

import { CreateCampaignDto } from './create-campaign.dto';

describe('CreateCampaignDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = (value: object) => pipe.transform(value, { type: 'body', metatype: CreateCampaignDto });

  const campaign = {
    title: 'Mango Cafe Feedback',
    description: 'Visit Prerna Test Cafe, try any drink and share your honest experience.',
    campaignType: 'REVIEW',
    rewardAmount: 50,
    totalBudget: 150,
  };

  it('accepts a campaign without a reward type, which is always cash', async () => {
    await expect(validate(campaign)).resolves.toMatchObject({ title: 'Mango Cafe Feedback' });
  });

  it('still accepts CASH from clients that send it', async () => {
    await expect(validate({ ...campaign, rewardType: 'CASH' })).resolves.toMatchObject({ rewardType: 'CASH' });
  });

  it.each(['POINTS', 'COUPON', 'GIFT_CARD', 'PRODUCT', 'DISCOUNT'])('refuses the %s reward type', async (rewardType) => {
    await expect(validate({ ...campaign, rewardType })).rejects.toBeDefined();
  });
});
