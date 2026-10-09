import { ValidationPipe } from '@nestjs/common';

import { CreateCampaignTaskDto, UpdateCampaignTaskDto } from '../../task/dto';
import { CreateCampaignDto, RecommendCampaignDto } from '../dto';

import { CampaignGoal, ENABLED_CAMPAIGN_GOALS } from './campaign-builder.constants';
import { ENABLED_CAMPAIGN_TYPES, ENABLED_PROOF_TYPES, ENABLED_TASK_TYPES } from './enabled-types.constants';

describe('the campaign and task types on offer', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = (metatype: new () => object, value: object) => pipe.transform(value, { type: 'body', metatype });

  it('offers reviews, social shares and social follows', () => {
    expect(ENABLED_CAMPAIGN_TYPES).toEqual(['REVIEW', 'SOCIAL_SHARE', 'SOCIAL_FOLLOW']);
  });

  it('keeps out the tasks whose feature is not built: video, website, app install, survey, referral', () => {
    for (const off of ['WATCH_VIDEO', 'WEBSITE_VISIT', 'APP_INSTALL', 'SURVEY', 'REFERRAL', 'FILE_UPLOAD', 'CUSTOM', 'TEXT']) {
      expect(ENABLED_TASK_TYPES).not.toContain(off);
    }
    expect(ENABLED_TASK_TYPES).toEqual(expect.arrayContaining(['GOOGLE_REVIEW', 'INSTAGRAM_FOLLOW', 'INSTAGRAM_STORY_SHARE', 'QR_SCAN']));
  });

  it('offers only the builder goals that lead to a campaign type on offer', () => {
    expect([...ENABLED_CAMPAIGN_GOALS].sort()).toEqual(
      [CampaignGoal.MORE_FOLLOWERS, CampaignGoal.MORE_REVIEWS, CampaignGoal.SPREAD_THE_WORD].sort(),
    );
  });

  const campaign = { title: 'Try our menu', description: 'Visit us and tell us honestly how it went.', rewardAmount: 50, totalBudget: 500 };

  it('accepts a review campaign and refuses a survey one', async () => {
    await expect(validate(CreateCampaignDto, { ...campaign, campaignType: 'REVIEW' })).resolves.toBeDefined();
    await expect(validate(CreateCampaignDto, { ...campaign, campaignType: 'SURVEY' })).rejects.toBeDefined();
  });

  it('accepts a Google review task and refuses an app install one', async () => {
    await expect(validate(CreateCampaignTaskDto, { title: 'Review us', taskType: 'GOOGLE_REVIEW' })).resolves.toBeDefined();
    await expect(validate(CreateCampaignTaskDto, { title: 'Install us', taskType: 'APP_INSTALL' })).rejects.toBeDefined();
  });

  it('asks for proof that shows the task was done, never a written answer', async () => {
    expect(ENABLED_PROOF_TYPES).toEqual(['SCREENSHOT', 'VIDEO', 'URL']);
    await expect(validate(CreateCampaignTaskDto, { title: 'Review us', taskType: 'GOOGLE_REVIEW', proofType: 'SCREENSHOT' })).resolves.toBeDefined();
    await expect(validate(CreateCampaignTaskDto, { title: 'Review us', taskType: 'GOOGLE_REVIEW', proofType: 'TEXT' })).rejects.toBeDefined();
    await expect(validate(UpdateCampaignTaskDto, { proofType: 'TEXT' })).rejects.toBeDefined();
  });

  it('refuses a builder goal that would lead to a campaign type not on offer', async () => {
    await expect(validate(RecommendCampaignDto, { goal: 'MORE_REVIEWS', budget: 5000 })).resolves.toBeDefined();
    await expect(validate(RecommendCampaignDto, { goal: 'APP_INSTALLS', budget: 5000 })).rejects.toBeDefined();
  });
});
