import { CampaignType, EvidenceType, TaskType } from '@prisma/client';

/**
 * The campaign types a merchant can create today. The others stay in the schema (existing campaigns keep them and
 * still show) but are switched off until what their name promises is built: Survey has no question builder, Video
 * Watch no player or watch-time check, Website Visit and App Install no tracking, Referral no link to the referral
 * system, and Custom is a catch-all the product does not offer yet. Turning one back on is adding it here; the merchant
 * portal and the mobile app keep their own copy of this list (constants/index.ts, campaign_browse.dart).
 */
export const ENABLED_CAMPAIGN_TYPES: readonly CampaignType[] = [
  CampaignType.REVIEW,
  CampaignType.SOCIAL_SHARE,
  CampaignType.SOCIAL_FOLLOW,
];

/**
 * The task types a merchant can add to a campaign today: reviews (with the AI review-draft help), social actions
 * proven by a screenshot, plain proof uploads, and the QR and location check-ins verified on the spot. Off for the
 * same reasons as above: WATCH_VIDEO, WEBSITE_VISIT, APP_INSTALL, SURVEY, REFERRAL, FILE_UPLOAD and CUSTOM. TEXT is
 * off too: a typed answer proves nothing, since anyone can write one without doing the task.
 */
export const ENABLED_TASK_TYPES: readonly TaskType[] = [
  TaskType.GOOGLE_REVIEW,
  TaskType.PLAY_STORE_REVIEW,
  TaskType.SCREENSHOT,
  TaskType.URL,
  TaskType.VIDEO,
  TaskType.INSTAGRAM_FOLLOW,
  TaskType.INSTAGRAM_LIKE,
  TaskType.INSTAGRAM_COMMENT,
  TaskType.INSTAGRAM_STORY_SHARE,
  TaskType.FACEBOOK_SHARE,
  TaskType.FACEBOOK_LIKE,
  TaskType.YOUTUBE_SUBSCRIBE,
  TaskType.TWITTER_FOLLOW,
  TaskType.QR_SCAN,
  TaskType.LOCATION_CHECKIN,
];

/**
 * The proof a merchant can ask for on an ordinary task: something that shows the task was done. A written answer is
 * not offered (see TEXT above). QR and location tasks bring their own proof, set by CampaignTaskService.
 */
export const ENABLED_PROOF_TYPES: readonly EvidenceType[] = [EvidenceType.SCREENSHOT, EvidenceType.VIDEO, EvidenceType.URL];
