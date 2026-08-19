export interface PaymentCapturedEventPayload {
  orderId: string;
  paymentId: string;
}

export interface PayoutStatusEventPayload {
  payoutId: string;
  referenceId: string | null;
  status: 'processed' | 'failed' | 'reversed';
  utr: string | null;
  failureReason: string | null;
}

export interface RazorpayWebhookBody {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string } };
    payout?: { entity: { id: string; reference_id: string | null; utr: string | null; failure_reason: string | null } };
  };
}

export type RazorpayWebhookEvent =
  | { name: string; payload: PaymentCapturedEventPayload }
  | { name: string; payload: PayoutStatusEventPayload };
