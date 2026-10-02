import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PolicyType } from '@prisma/client';

import { AUTH_EVENTS, POLICY_DOCUMENTS } from '../constants';
import { PolicyAcceptanceRepository } from '../repositories/policy-acceptance.repository';

export interface PolicyStatus {
  policy: PolicyType;
  title: string;
  /** Slug of the published CMS page holding the text: GET /pages/:slug. */
  slug: string;
  version: string;
  /** When the person accepted this version, or null if they have not yet. */
  acceptedAt: Date | null;
}

/**
 * Records that a person accepted the Terms & Conditions, Privacy Policy and Reward Policy (spec FR-008), and which
 * version. Sign-up records the current versions; when a version is bumped (see POLICY_DOCUMENTS) the apps see the
 * document in `pendingPolicies` on the profile and ask the person to accept it again.
 */
@Injectable()
export class PolicyAcceptanceService {
  constructor(
    private readonly repository: PolicyAcceptanceRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Each document currently in force, with whether and when this person accepted that version. */
  async getStatus(userId: string): Promise<PolicyStatus[]> {
    const accepted = await this.repository.findAccepted(userId, POLICY_DOCUMENTS);
    return POLICY_DOCUMENTS.map(({ policy, title, slug, version }) => ({
      policy,
      title,
      slug,
      version,
      acceptedAt: accepted.find((a) => a.policy === policy && a.version === version)?.acceptedAt ?? null,
    }));
  }

  /** The documents whose current version this person has not accepted yet. Empty means nothing to ask. */
  async getPending(userId: string): Promise<PolicyType[]> {
    const status = await this.getStatus(userId);
    return status.filter((s) => s.acceptedAt === null).map((s) => s.policy);
  }

  /**
   * Accepts every document currently in force. The person always accepts the full set they were shown, so there is
   * no per-document choice; versions already accepted keep their original time.
   */
  async acceptCurrent(userId: string, ipAddress?: string, userAgent?: string): Promise<PolicyStatus[]> {
    const documents = POLICY_DOCUMENTS.map(({ policy, version }) => ({ policy, version }));
    const { count } = await this.repository.createMany(userId, documents, ipAddress, userAgent);
    if (count > 0) {
      this.eventEmitter.emit(AUTH_EVENTS.POLICIES_ACCEPTED, { userId, ipAddress, documents });
    }
    return this.getStatus(userId);
  }
}
