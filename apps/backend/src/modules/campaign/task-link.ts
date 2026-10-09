import { TaskType } from '@prisma/client';

/**
 * Where a participant goes to do a task: the merchant's Google review page, Instagram profile, post to share, and so
 * on. Stored as `CampaignTask.configuration.targetUrl` and shown in the app as an "Open" button.
 *
 * WHY the site check: the app opens this link on the participant's phone, so a task may only send people to the site
 * its type names. A Google review task can not point at an arbitrary page, which keeps out typos and links that try
 * to collect passwords or install something.
 */
export interface TaskLinkSite {
  /** Shown to the merchant and on the app's button: "Open on Instagram". */
  site: string;
  /** A link's host must be one of these or end with "." plus one of them. */
  hosts: readonly string[];
}

const GOOGLE: TaskLinkSite = { site: 'Google', hosts: ['google.com', 'google.co.in', 'g.page', 'goo.gl'] };
const INSTAGRAM: TaskLinkSite = { site: 'Instagram', hosts: ['instagram.com', 'instagr.am'] };
const FACEBOOK: TaskLinkSite = { site: 'Facebook', hosts: ['facebook.com', 'fb.com', 'fb.me', 'fb.watch'] };

/** Task types done on another site: each needs a link to that site. Every other type may carry any https link. */
export const TASK_LINK_SITES: Partial<Record<TaskType, TaskLinkSite>> = {
  GOOGLE_REVIEW: GOOGLE,
  PLAY_STORE_REVIEW: { site: 'Google Play', hosts: ['play.google.com'] },
  INSTAGRAM_FOLLOW: INSTAGRAM,
  INSTAGRAM_LIKE: INSTAGRAM,
  INSTAGRAM_COMMENT: INSTAGRAM,
  INSTAGRAM_STORY_SHARE: INSTAGRAM,
  FACEBOOK_SHARE: FACEBOOK,
  FACEBOOK_LIKE: FACEBOOK,
  YOUTUBE_SUBSCRIBE: { site: 'YouTube', hosts: ['youtube.com', 'youtu.be'] },
  TWITTER_FOLLOW: { site: 'X (Twitter)', hosts: ['x.com', 'twitter.com'] },
};

export const TASK_LINK_MAX_LENGTH = 2000;

/** True when the task type is done on another site and so needs a link. */
export function taskNeedsLink(taskType: TaskType): boolean {
  return taskType in TASK_LINK_SITES;
}

/**
 * What is wrong with a task's link, in words a merchant can act on, or null when it is fine. A missing link is only
 * a problem for task types that need one.
 */
export function taskLinkProblem(taskType: TaskType, link: unknown): string | null {
  const rule = TASK_LINK_SITES[taskType];
  if (link === undefined || link === null || link === '') {
    return rule ? `Add the link to ${rule.site} that participants open to do this task` : null;
  }
  if (typeof link !== 'string' || link.length > TASK_LINK_MAX_LENGTH) return 'The link is not valid';

  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return 'The link is not valid: copy the full address, starting with https://';
  }
  if (url.protocol !== 'https:') return 'The link must start with https://';
  if (url.username || url.password) return 'The link is not valid';

  const host = url.hostname.toLowerCase();
  if (rule && !rule.hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
    return `This task needs a link to ${rule.site} (${rule.hosts.join(', ')})`;
  }
  return null;
}
