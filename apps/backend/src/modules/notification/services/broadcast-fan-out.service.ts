import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

import { QUEUE_NAMES } from '../../../queues/queue.constants';
import { BROADCAST_DUE_BATCH, BROADCAST_JOB_NAMES, BROADCAST_PAGE_SIZE, SMART_TIMING_EXCLUDED_TYPES } from '../constants';
import { AudienceFilter, BroadcastChannel, BroadcastFanOutJobData, DispatchNotificationPayload } from '../interfaces';
import { BroadcastAudienceRepository, NotificationBroadcastRepository } from '../repositories';
import { renderMessage } from '../utils/message-template.util';

import { SendTimeService } from './send-time.service';

/** Name used in a message when a user has no first name on file, e.g. "Hi there". */
const FALLBACK_FIRST_NAME = 'there';
const MAX_FIRST_NAME_LENGTH = 50;

/** BullMQ forbids ':' in custom job ids, so ids are joined with '-'. */
const fanOutJobId = (broadcastId: string) => `broadcast-fan-out-${broadcastId}`;
const dispatchJobId = (broadcastId: string, userId: string) => `broadcast-${broadcastId}-${userId}`;

/**
 * Turns one broadcast into one ordinary notification job per recipient, so every message gets the same
 * preference checks, retries and delivery code as any other notification.
 *
 * Safe to run twice and safe to interrupt: progress is checkpointed after every page, a retry resumes
 * from the last checkpoint, and each recipient's job has a fixed id so a page that is queued twice
 * still produces a single message.
 */
@Injectable()
export class BroadcastFanOutService {
  private readonly logger = new Logger(BroadcastFanOutService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS) private readonly queue: Queue,
    private readonly broadcastRepository: NotificationBroadcastRepository,
    private readonly audienceRepository: BroadcastAudienceRepository,
    private readonly sendTimeService: SendTimeService,
  ) {}

  /** Asks the worker to start sending a broadcast. Returns immediately; the sending happens in the background. */
  async enqueue(broadcastId: string): Promise<void> {
    const jobId = fanOutJobId(broadcastId);

    // A failed job with this id would silently block a new one, leaving the broadcast stuck as scheduled.
    const previous = await this.queue.getJob(jobId);
    if (previous && (await previous.isFailed())) await previous.remove();

    await this.queue.add(BROADCAST_JOB_NAMES.FAN_OUT, { broadcastId } satisfies BroadcastFanOutJobData, { jobId });
  }

  /** Starts every broadcast whose scheduled time has arrived. Returns how many were started. */
  async enqueueDue(now: Date = new Date()): Promise<number> {
    const dueIds = await this.broadcastRepository.findDueIds(now, BROADCAST_DUE_BATCH);
    for (const id of dueIds) await this.enqueue(id);
    if (dueIds.length > 0) this.logger.log(`Started ${dueIds.length} scheduled broadcast(s)`);
    return dueIds.length;
  }

  /** Queues a message for every recipient, page by page. Does nothing for a broadcast that was cancelled or already finished. */
  async run(broadcastId: string): Promise<void> {
    const broadcast = await this.broadcastRepository.claimForSending(broadcastId);
    if (!broadcast) {
      this.logger.warn(`Broadcast ${broadcastId} is not sendable (cancelled, finished or missing) — skipping`);
      return;
    }

    const audience = broadcast.audience as AudienceFilter;
    const channels = broadcast.channels as BroadcastChannel[];
    // A broadcast created with smart timing before its type was restricted is still sent straight away if it is a system one.
    const smartTiming = broadcast.smartTiming && !SMART_TIMING_EXCLUDED_TYPES.includes(broadcast.type);
    let cursor = broadcast.cursorUserId;
    let recipients = broadcast.recipientCount;

    for (;;) {
      const page = await this.audienceRepository.findPage(audience, cursor, BROADCAST_PAGE_SIZE);
      if (page.length === 0) break;

      // Held-back jobs wait in the queue until their hour; the job id still makes a re-queued page a no-op.
      const delays = smartTiming ? await this.sendTimeService.computeDelays(page.map((user) => user.id)) : null;

      await this.queue.addBulk(
        page.map((user) => ({
          name: 'dispatch',
          data: {
            userId: user.id,
            type: broadcast.type,
            title: renderMessage(broadcast.title, { firstName: displayName(user.firstName) }),
            message: renderMessage(broadcast.message, { firstName: displayName(user.firstName) }),
            channels,
            broadcastId: broadcast.id,
            data: { broadcastId: broadcast.id },
          } satisfies DispatchNotificationPayload,
          opts: { jobId: dispatchJobId(broadcast.id, user.id), ...(delays ? { delay: delays.get(user.id) } : {}) },
        })),
      );

      cursor = page[page.length - 1].id;
      recipients += page.length;
      await this.broadcastRepository.saveProgress(broadcast.id, cursor, recipients);
    }

    await this.broadcastRepository.markSent(broadcast.id);
    this.logger.log(`Broadcast ${broadcast.id} queued for ${recipients} recipient(s)${smartTiming ? ' with smart timing' : ''}`);
  }

  /** Called once BullMQ has given up retrying, so the admin sees FAILED rather than a broadcast stuck as sending. */
  async fail(broadcastId: string, reason: string): Promise<void> {
    await this.broadcastRepository.markFailed(broadcastId, reason);
    this.logger.error(`Broadcast ${broadcastId} failed: ${reason}`);
  }
}

function displayName(firstName: string): string {
  const name = firstName.trim().slice(0, MAX_FIRST_NAME_LENGTH);
  return name || FALLBACK_FIRST_NAME;
}
