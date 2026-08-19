import { SupportTicketStatus } from '@prisma/client';

export const SUPPORT_EVENTS = {
  TICKET_CREATED: 'support.ticket.created',
  MESSAGE_ADDED: 'support.message.added',
  STATUS_CHANGED: 'support.status.changed',
} as const;

/** Statuses a reply is still allowed on — a CLOSED ticket must be reopened via an explicit status change first. */
export const REPLYABLE_STATUSES: SupportTicketStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_USER'];
