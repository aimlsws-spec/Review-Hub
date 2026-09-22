import { buildValidationPipe } from '@common/pipes/validation.pipe';

import { UpdatePlatformConfigurationDto } from './update-platform-configuration.dto';

/** Runs a body through the same pipe the app uses, so the result is what a request would get. */
const validate = (value: unknown) => buildValidationPipe().transform(value, { type: 'body', metatype: UpdatePlatformConfigurationDto } as never);

describe('UpdatePlatformConfigurationDto: maintenance and app version', () => {
  it.each([true, false])('accepts maintenanceMode %s', async (maintenanceMode) => {
    await expect(validate({ maintenanceMode })).resolves.toMatchObject({ maintenanceMode });
  });

  it.each(['false', 'true', 'yes', 1, 0, null])('refuses maintenanceMode %j: the string "false" must not switch maintenance on', async (maintenanceMode) => {
    await expect(validate({ maintenanceMode })).rejects.toMatchObject({ status: 422 });
  });

  it.each(['1.0.0', '1.14.3', '10.20.30'])('accepts the minimum app version %s', async (minimumAppVersion) => {
    await expect(validate({ minimumAppVersion })).resolves.toMatchObject({ minimumAppVersion });
  });

  it.each(['1', '1.2', '1.2.x', 'v1.2.3', '1.2.3.4', '1.2.3-beta', ''])('refuses the minimum app version %j', async (minimumAppVersion) => {
    await expect(validate({ minimumAppVersion })).rejects.toMatchObject({ status: 422 });
  });

  it('accepts an https update link, and lets it and the message be cleared with null', async () => {
    await expect(validate({ updateUrl: 'https://play.google.com/store/apps/details?id=com.example' })).resolves.toBeDefined();
    await expect(validate({ updateUrl: null, maintenanceMessage: null })).resolves.toMatchObject({ updateUrl: null, maintenanceMessage: null });
  });

  it.each(['http://example.com/app', 'play.google.com/store', 'javascript:alert(1)', 'not a link'])('refuses the update link %j: people are sent to it, so it has to be a real https address', async (updateUrl) => {
    await expect(validate({ updateUrl })).rejects.toMatchObject({ status: 422 });
  });

  it('refuses a maintenance message that is too long to show', async () => {
    await expect(validate({ maintenanceMessage: 'x'.repeat(301) })).rejects.toMatchObject({ status: 422 });
    await expect(validate({ maintenanceMessage: 'x'.repeat(300) })).resolves.toBeDefined();
  });
});
