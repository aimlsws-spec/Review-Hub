import * as crypto from 'crypto';

import { Injectable } from '@nestjs/common';

import { CacheService } from '../../../cache/cache.service';
import { LOGIN_CHALLENGE_TTL_SECONDS } from '../constants';
import { DeviceRepository } from '../repositories/device.repository';

/** A password sign-in that is waiting for its new-device code. Kept in Redis only, for LOGIN_CHALLENGE_TTL_SECONDS. */
export interface PendingLogin {
  userId: string;
  rememberMe: boolean;
  /** Hashed install id of the device that signed in (DeviceService.hashInstallId), or null when it sent none. */
  installIdHash: string | null;
  isRooted?: boolean;
  isEmulator?: boolean;
  isAutomationDetected?: boolean;
  vpnSuspected: boolean;
  /**
   * Whether the device was new to the account (two-factor sign-ins are held on known devices too), so the alert
   * email goes out only for a new one. Missing on challenges stored before this field existed: those were all new.
   */
  isNewDevice?: boolean;
}

/**
 * Decides whether a sign-in comes from a device the account has not used before, and holds such a sign-in until the
 * person proves it is them with a one-time code (spec: "unknown device → OTP required → email alert").
 *
 * A device is recognised by the stable install id every client sends as X-Device-ID (the app's install id, or the
 * id a portal keeps in the browser), never by IP or user agent, which change on every network.
 *
 * The first device an account ever reports is trusted without a code: that is almost always the one the person signed
 * up on, and accounts created before this check existed would otherwise all be asked once for no reason.
 */
@Injectable()
export class NewDeviceService {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly cache: CacheService,
  ) {}

  /** True when the account has a recognised device already and this sign-in is not from one of them. */
  async isUnrecognised(userId: string, installIdHash: string | undefined): Promise<boolean> {
    const knownDevices = await this.deviceRepository.countWithInstallId(userId);
    if (knownDevices === 0) return false;
    // No id at all cannot be matched to anything, so it is never recognised.
    if (!installIdHash) return true;
    return !(await this.deviceRepository.existsForInstall(userId, installIdHash));
  }

  /** Stores the pending sign-in and returns the token the client sends back with the code. */
  async createChallenge(pending: PendingLogin): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    await this.cache.set(this.key(token), pending, LOGIN_CHALLENGE_TTL_SECONDS);
    return token;
  }

  /**
   * The pending sign-in for a token, or null when it is unknown or expired, or when the request comes from a
   * different device than the sign-in did: a stolen token is useless anywhere but the device it was issued to.
   */
  async findChallenge(token: string, installIdHash: string | undefined): Promise<PendingLogin | null> {
    const pending = await this.cache.get<PendingLogin>(this.key(token));
    if (!pending) return null;
    if ((pending.installIdHash ?? null) !== (installIdHash ?? null)) return null;
    return pending;
  }

  async consumeChallenge(token: string): Promise<void> {
    await this.cache.del(this.key(token));
  }

  /** Only a hash of the token is used as the key, so reading Redis does not hand out live tokens. */
  private key(token: string): string {
    return `login_challenge:${crypto.createHash('sha256').update(token).digest('hex')}`;
  }
}
