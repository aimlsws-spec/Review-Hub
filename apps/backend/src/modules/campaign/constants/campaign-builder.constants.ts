import { CampaignType } from '@prisma/client';

/** What a merchant is trying to achieve. The builder maps each goal to the campaign type that serves it. */
export enum CampaignGoal {
  MORE_REVIEWS = 'MORE_REVIEWS',
  MORE_FOLLOWERS = 'MORE_FOLLOWERS',
  SPREAD_THE_WORD = 'SPREAD_THE_WORD',
  APP_INSTALLS = 'APP_INSTALLS',
  WEBSITE_TRAFFIC = 'WEBSITE_TRAFFIC',
  CUSTOMER_FEEDBACK = 'CUSTOMER_FEEDBACK',
  VIDEO_VIEWS = 'VIDEO_VIEWS',
}

export interface GoalProfile {
  campaignType: CampaignType;
  /** Starting reward per person, in rupees. A default to edit, not a promise of results. */
  defaultReward: number;
  minReward: number;
  maxReward: number;
  /** Followers a participant should have for the reward to be worth paying; 0 when it does not matter. */
  minimumFollowers: number;
  title: (businessName: string) => string;
  shortDescription: string;
  description: (businessName: string) => string;
}

export const GOAL_PROFILES: Record<CampaignGoal, GoalProfile> = {
  [CampaignGoal.MORE_REVIEWS]: {
    campaignType: CampaignType.REVIEW,
    defaultReward: 50,
    minReward: 20,
    maxReward: 500,
    minimumFollowers: 0,
    title: (name) => `Share your honest review of ${name}`,
    shortDescription: 'Tell others about your real experience and get rewarded.',
    description: (name) =>
      `Visit ${name} and write an honest review about your experience. Please describe what you actually tried and what you liked or did not like. Add a screenshot of your posted review as proof.`,
  },
  [CampaignGoal.MORE_FOLLOWERS]: {
    campaignType: CampaignType.SOCIAL_FOLLOW,
    defaultReward: 15,
    minReward: 5,
    maxReward: 100,
    minimumFollowers: 0,
    title: (name) => `Follow ${name} on social media`,
    shortDescription: 'Follow the page and get rewarded.',
    description: (name) =>
      `Follow the official ${name} page on social media and keep following it. Add a screenshot showing that you follow the page as proof.`,
  },
  [CampaignGoal.SPREAD_THE_WORD]: {
    campaignType: CampaignType.SOCIAL_SHARE,
    defaultReward: 25,
    minReward: 10,
    maxReward: 200,
    minimumFollowers: 100,
    title: (name) => `Share ${name} with your friends`,
    shortDescription: 'Post about us on your story or feed and get rewarded.',
    description: (name) =>
      `Share a post or story about ${name} with your friends and followers. Use your own words and tell them why you like it. Add a screenshot of your post as proof.`,
  },
  [CampaignGoal.APP_INSTALLS]: {
    campaignType: CampaignType.APP_INSTALL,
    defaultReward: 40,
    minReward: 15,
    maxReward: 300,
    minimumFollowers: 0,
    title: (name) => `Install the ${name} app`,
    shortDescription: 'Install the app, open it once and get rewarded.',
    description: (name) =>
      `Install the ${name} app on your phone and open it. Add a screenshot of the app open on your phone as proof.`,
  },
  [CampaignGoal.WEBSITE_TRAFFIC]: {
    campaignType: CampaignType.WEBSITE_VISIT,
    defaultReward: 10,
    minReward: 3,
    maxReward: 100,
    minimumFollowers: 0,
    title: (name) => `Visit the ${name} website`,
    shortDescription: 'Take a look around our website and get rewarded.',
    description: (name) =>
      `Visit the ${name} website and look through what we offer. Add a screenshot of the site open on your phone as proof.`,
  },
  [CampaignGoal.CUSTOMER_FEEDBACK]: {
    campaignType: CampaignType.SURVEY,
    defaultReward: 20,
    minReward: 8,
    maxReward: 150,
    minimumFollowers: 0,
    title: (name) => `Tell ${name} what you think`,
    shortDescription: 'Answer a few quick questions and get rewarded.',
    description: (name) =>
      `Answer a short survey about ${name} and give your honest opinion. Add a screenshot of the completed survey as proof.`,
  },
  [CampaignGoal.VIDEO_VIEWS]: {
    campaignType: CampaignType.VIDEO_WATCH,
    defaultReward: 8,
    minReward: 3,
    maxReward: 60,
    minimumFollowers: 0,
    title: (name) => `Watch the ${name} video`,
    shortDescription: 'Watch the video and get rewarded.',
    description: (name) => `Watch the ${name} video until the end. Add a screenshot showing you watched it as proof.`,
  },
};

/** The builder aims for at least this many participants; a smaller reward is chosen when the budget is tight. */
export const TARGET_MIN_PARTICIPANTS = 20;

/** Below this many participants the budget is flagged as too small to test a campaign. */
export const SMALL_CAMPAIGN_PARTICIPANTS = 10;

/** Platform history is only used when at least this many comparable campaigns exist. */
export const MIN_HISTORY_SAMPLE = 5;

/** A past campaign only counts as "worked" when at least this many people joined. */
export const HISTORY_MIN_JOINED = 10;

/** How many past campaigns are read to find the typical reward. */
export const HISTORY_SAMPLE_LIMIT = 200;

/** A merchant's own similar campaign is flagged when it had at least this many joins and finished below this rate. */
export const OWN_HISTORY_MIN_JOINS = 20;

/** How many of the merchant own recent campaigns of the same type are looked at. */
export const OWN_HISTORY_LOOKBACK = 5;
export const OWN_HISTORY_LOW_COMPLETION = 0.25;

export const DEFAULT_CAMPAIGN_DURATION_DAYS = 7;
