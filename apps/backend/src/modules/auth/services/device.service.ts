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
}

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
        // Update existing device
        await this.deviceRepository.update(existingDevice.id, {
          name: metadata.name ?? existingDevice.name,
          platform: metadata.platform,
          os: metadata.os ?? existingDevice.os,
          appVersion: metadata.appVersion ?? existingDevice.appVersion,
          pushToken: metadata.pushToken ?? existingDevice.pushToken,
          isActive: true,
          lastSeenAt: new Date(),
        });
        return existingDevice.id;
      }
    }

    // Create new device
    const device = await this.deviceRepository.create({
      user: { connect: { id: userId } },
      name: metadata.name,
      platform: metadata.platform,
      os: metadata.os,
      appVersion: metadata.appVersion,
      fingerprint: metadata.fingerprint,
      pushToken: metadata.pushToken,
      isActive: true,
      lastSeenAt: new Date(),
    });

    return device.id;
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