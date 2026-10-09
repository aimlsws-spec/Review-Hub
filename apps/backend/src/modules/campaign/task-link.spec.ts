import { taskLinkProblem, taskNeedsLink } from './task-link';

describe('task links', () => {
  it('knows which task types happen on another site', () => {
    expect(taskNeedsLink('GOOGLE_REVIEW')).toBe(true);
    expect(taskNeedsLink('INSTAGRAM_FOLLOW')).toBe(true);
    expect(taskNeedsLink('SCREENSHOT')).toBe(false);
    expect(taskNeedsLink('QR_SCAN')).toBe(false);
  });

  it.each([
    ['GOOGLE_REVIEW', 'https://g.page/r/CbXyz123/review'],
    ['GOOGLE_REVIEW', 'https://maps.app.goo.gl/AbC123'],
    ['GOOGLE_REVIEW', 'https://www.google.co.in/maps/place/Prerna+Cafe'],
    ['GOOGLE_REVIEW', 'https://search.google.com/local/writereview?placeid=ChIJ123'],
    ['PLAY_STORE_REVIEW', 'https://play.google.com/store/apps/details?id=in.viralkar.app'],
    ['INSTAGRAM_FOLLOW', 'https://www.instagram.com/prernatestcafe/'],
    ['INSTAGRAM_STORY_SHARE', 'https://instagram.com/p/Cx12AbC/'],
    ['FACEBOOK_SHARE', 'https://www.facebook.com/prernacafe/posts/123'],
    ['YOUTUBE_SUBSCRIBE', 'https://youtube.com/@prernacafe'],
    ['TWITTER_FOLLOW', 'https://x.com/prernacafe'],
    ['SCREENSHOT', 'https://prernacafe.in/menu'],
  ] as const)('accepts a %s link to the right site: %s', (taskType, link) => {
    expect(taskLinkProblem(taskType, link)).toBeNull();
  });

  it('needs a link for a task done on another site, and names the site', () => {
    expect(taskLinkProblem('INSTAGRAM_FOLLOW', undefined)).toBe('Add the link to Instagram that participants open to do this task');
    expect(taskLinkProblem('GOOGLE_REVIEW', '')).toMatch(/link to Google/);
  });

  it('does not need a link for a proof upload, QR scan or check-in', () => {
    expect(taskLinkProblem('SCREENSHOT', undefined)).toBeNull();
    expect(taskLinkProblem('QR_SCAN', null)).toBeNull();
  });

  it.each([
    ['INSTAGRAM_FOLLOW', 'https://instagram.com.evil.example/login', /needs a link to Instagram/],
    ['GOOGLE_REVIEW', 'https://notgoogle.com/review', /link to Google/],
    ['INSTAGRAM_FOLLOW', 'http://instagram.com/prernatestcafe', /https/],
    ['SCREENSHOT', 'javascript:alert(1)', /https/],
    ['SCREENSHOT', 'instagram.com/prernatestcafe', /full address/],
    ['SCREENSHOT', 'https://user:pass@prernacafe.in', /not valid/],
    ['SCREENSHOT', 42, /not valid/],
  ] as const)('refuses a %s link %s', (taskType, link, message) => {
    expect(taskLinkProblem(taskType, link)).toMatch(message);
  });

  it('refuses a link that is too long', () => {
    expect(taskLinkProblem('SCREENSHOT', `https://prernacafe.in/${'a'.repeat(2000)}`)).toBe('The link is not valid');
  });
});
