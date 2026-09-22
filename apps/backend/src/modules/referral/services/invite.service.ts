import { Injectable, Logger } from '@nestjs/common';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AppConfigService } from '../../app-config/services';
import { REFERRAL_CONSTANTS } from '../constants';

/**
 * Where an invite link sends people: the store page the admin set as the app's update link, with the referral code
 * attached in the form Google Play hands back to the app after it is installed.
 *
 * There is no website to host an invite page, so the link lives on the backend and only redirects. It says nothing
 * about the code (a made-up one redirects like a real one), so it can not be used to find out which codes exist.
 */
@Injectable()
export class InviteService {
  private readonly logger = new Logger(InviteService.name);

  constructor(private readonly appConfigService: AppConfigService) {}

  /** The address to send the person to for a given referral code. */
  async destinationFor(code: string): Promise<string> {
    // Checked before it goes anywhere near an address, so nothing but a plain code can end up in the redirect.
    if (!REFERRAL_CONSTANTS.INVITE_CODE_PATTERN.test(code)) throw new BadRequestException('That invite link is not valid');

    const { updateUrl } = await this.appConfigService.snapshot();
    if (!updateUrl) throw new NotFoundException('The app store link');

    let destination: URL;
    try {
      destination = new URL(updateUrl);
    } catch {
      // The admin's setting is checked when it is saved, so this is only a corrupted value.
      this.logger.error('The update link in the platform settings is not a web address; invite links are not working');
      throw new NotFoundException('The app store link');
    }

    // Only the Play Store understands the referrer. Any other address is left exactly as the admin wrote it.
    if (destination.hostname === 'play.google.com') destination.searchParams.set('referrer', `code=${code}`);

    this.logger.log('Invite link opened');
    return destination.toString();
  }
}
