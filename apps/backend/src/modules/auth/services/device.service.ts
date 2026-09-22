import * as crypto from 'crypto';

import { Injectable } from '@nestjs/common';
import { DevicePlatform } from '@prisma/client';

import { DeviceRepository } from '../repositories/device.repository';

export interface DeviceMetadata {
  name?: string;
  platform: DevicePlatform;
  os?: string;
  appVersion?: string;
  fingerprint?: string;
  pushToken?: string;
  isRooted?: boolean;
  isEmulator?: boolean;
  vpnSuspected?: boolean;
  /** SHA-256 of the app's stable install id (see hashInstallId). */
  installId?: string;
}

/**
 * Raw signals gathered per-request for basic fraud-risk scoring. isRooted/
 * isEmulator are self-reported by the client (a server can't reliably detect
 * either from HTTP alone). xForwardedFor/via are the two request headers this
 * heuristic inspects for proxy/VPN suspicion — not a commercial IP-intel
 * lookup, just a free first-pass signal.
 */
export interface DeviceSignalsInput {
  isRooted?: boolean;
  isEmulator?: boolean;
  xForwardedFor?: string;
  via?: string;
  /** The raw X-Device-ID header the app sends. Validated and hashed by DeviceService.hashInstallId before storing. */
  installId?: string;
}

/** What an install id may look like: a UUID or similar opaque token, never free text. */
const INSTALL_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

@Injectable()
export class DeviceService {
  constructor(private readonly deviceRepository: DeviceRepository) {}

  /**
   * Register or update a device for a user
   */
  async registerDevice(
    userId: string,
    metadata: DeviceMetadata,
  ): Promise<string> {
    // Try to find existing device by fingerprint
    if (metadata.fingerprint) {
      const existingDevice = await this.deviceRepository.findByFingerprint(
        userId,
        metadata.fingerprint,
      );

      if (existingDevice) {
        // Update existing device. isRooted/isEmulator/vpnSuspected trust the
        // latest report over the stored value (a rooted device can be
        // un-rooted, a VPN can be turned off) rather than sticking once flagged.
        const isRooted = metadata.isRooted ?? existingDevice.isRooted;
        const isEmulator = metadata.isEmulator ?? existingDevice.isEmulator;
        const vpnSuspected = metadata.vpnSuspected ?? existingDevice.vpnSuspected;

        await this.deviceRepository.update(existingDevice.id, {
          name: metadata.name ?? existingDevice.name,
          platform: metadata.platform,
          os: metadata.os ?? existingDevice.os,
          appVersion: metadata.appVersion ?? existingDevice.appVersion,
          pushToken: metadata.pushToken ?? existingDevice.pushToken,
          isRooted,
          isEmulator,
          vpnSuspected,
          installId: metadata.installId ?? existingDevice.installId,
          riskScore: this.calculateRiskScore({ isRooted, isEmulator, vpnSuspected }),
          isActive: true,
          lastSeenAt: new Date(),
        });
        return existingDevice.id;
      }
    }

    const isRooted = metadata.isRooted ?? false;
    const isEmulator = metadata.isEmulator ?? false;
    const vpnSuspected = metadata.vpnSuspected ?? false;

    // Create new device
    const device = await this.deviceRepository.create({
      user: { connect: { id: userId } },
      name: metadata.name,
      platform: metadata.platform,
      os: metadata.os,
      appVersion: metadata.appVersion,
      fingerprint: metadata.fingerprint,
      pushToken: metadata.pushToken,
      isRooted,
      isEmulator,
      vpnSuspected,
      installId: metadata.installId,
      riskScore: this.calculateRiskScore({ isRooted, isEmulator, vpnSuspected }),
      isActive: true,
      lastSeenAt: new Date(),
    });

    return device.id;
  }

  /**
   * Weighted sum, not a real risk model — rooted/emulator each dominate the
   * score since either one is a strong signal on its own, VPN suspicion adds
   * a smaller amount since the header heuristic below is much weaker evidence.
   */
  calculateRiskScore(signals: { isRooted?: boolean; isEmulator?: boolean; vpnSuspected?: boolean }): number {
    let score = 0;
    if (signals.isRooted) score += 40;
    if (signals.isEmulator) score += 40;
    if (signals.vpnSuspected) score += 20;
    return Math.min(score, 100);
  }

  /**
   * Free, header-only proxy/VPN heuristic — not a commercial IP-reputation
   * lookup. A `Via` header or more than one hop in `X-Forwarded-For` suggests
   * traffic passed through an intermediary, which is weak but free evidence
   * of a proxy/VPN in the path. Produces false negatives (most VPNs don't
   * add these headers) and occasional false positives (some corporate
   * networks/CDNs do too) — treat this as a low-confidence signal only.
   */
  detectVpnSuspicion(signals: Pick<DeviceSignalsInput, 'xForwardedFor' | 'via'>): boolean {
    if (signals.via) return true;
    if (signals.xForwardedFor && signals.xForwardedFor.split(',').length > 1) return true;
    return false;
  }

  /**
   * Turns the X-Device-ID header into what we store: a SHA-256 hash, or undefined if it is missing or not a
   * plausible id. The raw id is never stored, so it cannot be read back or reused, yet the same install always
   * hashes the same, which is all that linking accounts on one device needs. (The `fingerprint` column is only a
   * hash of user agent and IP, so it cannot tell devices apart across networks; this can.)
   */
  hashInstallId(raw?: string): string | undefined {
    const value = raw?.trim();
    if (!value || !INSTALL_ID_PATTERN.test(value)) return undefined;
    return crypto.createHash('sha256').update(`install:${value}`).digest('hex');
  }

  /**
   * Get user's registered devices
   */
  async getUserDevices(userId: string) {
    return this.deviceRepository.findByUserId(userId);
  }

  /**
   * Update device last seen timestamp
   */
  async updateLastSeen(deviceId: string) {
    return this.deviceRepository.updateLastSeen(deviceId);
  }

  /**
   * Update a device's FCM push token — called by the mobile app once it obtains
   * or refreshes its token, separately from login (the token isn't always ready
   * at auth time).
   */
  async updatePushToken(deviceId: string, pushToken: string) {
    return this.deviceRepository.update(deviceId, { pushToken });
  }

  /**
   * Deactivate a specific device
   */
  async deactivateDevice(deviceId: string) {
    return this.deviceRepository.deactivate(deviceId);
  }

  /**
   * Deactivate all devices for a user (except optionally one)
   */
  async deactivateAllDevices(userId: string, excludeDeviceId?: string) {
    return this.deviceRepository.deactivateAllByUserId(userId, excludeDeviceId);
  }

  /**
   * Parse user agent to extract device metadata
   */
  parseUserAgent(userAgent?: string): Partial<DeviceMetadata> {
    if (!userAgent) {
      return { platform: DevicePlatform.WEB };
    }

    const ua = userAgent.toLowerCase();
    let platform: DevicePlatform = DevicePlatform.WEB;
    let os: string | undefined;

    if (/android/.test(ua)) {
      platform = DevicePlatform.ANDROID;
      const match = ua.match(/android\s([\d.]+)/);
      os = match ? `Android ${match[1]}` : 'Android';
    } else if (/iphone|ipad|ipod/.test(ua)) {
      platform = DevicePlatform.IOS;
      const match = ua.match(/os\s([\d_]+)/);
      os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
    } else if (/windows/.test(ua)) {
      os = 'Windows';
    } else if (/macintosh|mac os/.test(ua)) {
      os = 'macOS';
    } else if (/linux/.test(ua)) {
      os = 'Linux';
    }

    // Extract browser/app name
    let name: string | undefined;
    if (/chrome/.test(ua) && !/edge/.test(ua)) {
      name = 'Chrome';
    } else if (/firefox/.test(ua)) {
      name = 'Firefox';
    } else if (/safari/.test(ua) && !/chrome/.test(ua)) {
      name = 'Safari';
    } else if (/edge/.test(ua)) {
      name = 'Edge';
    }

    return { platform, os, name };
  }

  /**
   * Generate a device fingerprint from request metadata
   */
  generateFingerprint(userAgent?: string, ipAddress?: string): string {
    const data = `${userAgent || ''}:${ipAddress || ''}`;
    return crypto.createHash('sha256').update(data).digest('hex').slice(0, 32);
  }
}