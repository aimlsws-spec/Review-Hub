import { ValidationPipe } from '@nestjs/common';

import { UpdateCampaignDto } from './update-campaign.dto';

describe('UpdateCampaignDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = (value: object) => pipe.transform(value, { type: 'body', metatype: UpdateCampaignDto });

  /** What the merchant portal's edit form sends (CampaignsPage), with a cleared start date and participant cap. */
  const portalEdit = {
    title: 'Mango Cafe Feedback',
    shortDescription: 'Tell us about your visit',
    description: 'Visit Prerna Test Cafe, try any drink and share your honest experience.',
    rewardAmount: 50,
    totalBudget: 150,
    targetGender: 'ALL',
    maxParticipants: null,
    startAt: null,
    endAt: '2030-11-07T18:29:59.999Z',
  };

  it("accepts what the portal's edit form sends", async () => {
    await expect(validate(portalEdit)).resolves.toMatchObject({ title: 'Mango Cafe Feedback', endAt: '2030-11-07T18:29:59.999Z' });
  });

  it('refuses a change of campaign or reward type, which are fixed when the campaign is created', async () => {
    await expect(validate({ ...portalEdit, campaignType: 'REVIEW' })).rejects.toBeDefined();
    await expect(validate({ ...portalEdit, rewardType: 'CASH' })).rejects.toBeDefined();
  });
});
