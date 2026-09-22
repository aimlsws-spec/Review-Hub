import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { InviteService } from './invite.service';

describe('InviteService', () => {
  const appConfig = { snapshot: jest.fn() };
  let service: InviteService;

  const withLink = (updateUrl: string | null) => appConfig.snapshot.mockResolvedValue({ maintenanceMode: false, maintenanceMessage: '', minimumAppVersion: '1.0.0', updateUrl });

  beforeEach(() => {
    jest.resetAllMocks();
    service = new InviteService(appConfig as never);
  });

  it('sends the person to the Play Store page with the code attached the way Play hands it back to the app', async () => {
    withLink('https://play.google.com/store/apps/details?id=com.seawindsolution.viralkar');

    const destination = new URL(await service.destinationFor('ASHA-123'));

    expect(destination.origin + destination.pathname).toBe('https://play.google.com/store/apps/details');
    expect(destination.searchParams.get('id')).toBe('com.seawindsolution.viralkar');
    expect(destination.searchParams.get('referrer')).toBe('code=ASHA-123');
  });

  it('works for a code that is a UUID, which is what referral codes are today', async () => {
    withLink('https://play.google.com/store/apps/details?id=x');
    const uuid = '3f1c2e8a-1b2c-4d5e-8f90-a1b2c3d4e5f6';

    const destination = new URL(await service.destinationFor(uuid));

    expect(destination.searchParams.get('referrer')).toBe(`code=${uuid}`);
  });

  it('writes the referrer encoded once, as Play expects: code%3D…', async () => {
    withLink('https://play.google.com/store/apps/details?id=x');

    expect(await service.destinationFor('ABC123')).toContain('referrer=code%3DABC123');
  });

  it('replaces a referrer the link already had, so the code in the link is the code that is used', async () => {
    withLink('https://play.google.com/store/apps/details?id=x&referrer=utm_source%3Dold');

    const destination = new URL(await service.destinationFor('ABC123'));

    expect(destination.searchParams.getAll('referrer')).toEqual(['code=ABC123']);
  });

  it('leaves any other address exactly as the admin wrote it, since only the Play Store understands a referrer', async () => {
    withLink('https://example.com/get-the-app?campaign=launch');

    await expect(service.destinationFor('ABC123')).resolves.toBe('https://example.com/get-the-app?campaign=launch');
  });

  it('does not treat a look-alike address as the Play Store', async () => {
    withLink('https://play.google.com.evil.example/store/apps/details?id=x');

    expect(await service.destinationFor('ABC123')).not.toContain('referrer');
  });

  it.each(['abc', 'a'.repeat(65), 'has space', 'a/b', 'a?b=c', 'code&x=1', '../etc', 'ABC%0d%0aSet-Cookie', 'ABC\r\nX: y', '<script>', ''])('refuses the code %j: nothing but a plain code can reach the redirect', async (code) => {
    withLink('https://play.google.com/store/apps/details?id=x');

    await expect(service.destinationFor(code)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('says not found when the admin has not set a store link yet', async () => {
    withLink(null);

    await expect(service.destinationFor('ABC123')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('says not found, and does not redirect anywhere, for a stored value that is not a web address', async () => {
    withLink('not a url');

    await expect(service.destinationFor('ABC123')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('answers the same for a code that was never issued, so it can not be used to find out which exist', async () => {
    withLink('https://play.google.com/store/apps/details?id=x');

    await expect(service.destinationFor('NEVER-ISSUED')).resolves.toContain('referrer=code%3DNEVER-ISSUED');
  });
});
