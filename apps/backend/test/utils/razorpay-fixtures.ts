import * as fs from 'fs';
import * as path from 'path';

/**
 * Loads the recorded-shape Razorpay webhook fixtures (test/fixtures/razorpay) for tests. Each body is read as raw bytes,
 * because a webhook's signature is made over exactly those bytes, and the stored signatures were made independently of
 * the code under test (see the header of the script that made them).
 */
const DIR = path.resolve(__dirname, '../fixtures/razorpay');

export interface RazorpayFixtures {
  webhookSecret: string;
  keySecret: string;
  withdrawalId: string;
  payment: { orderId: string; paymentId: string; signature: string };
  /** The bytes of a webhook body, by event name. */
  body(name: string): Buffer;
  /** The signature Razorpay would send with that body. */
  signature(name: string): string;
  names: string[];
}

export function loadRazorpayFixtures(): RazorpayFixtures {
  const stored = JSON.parse(fs.readFileSync(path.join(DIR, 'signatures.json'), 'utf8')) as {
    webhookSecret: string;
    keySecret: string;
    withdrawalId: string;
    webhooks: Record<string, string>;
    payment: { orderId: string; paymentId: string; signature: string };
  };

  return {
    webhookSecret: stored.webhookSecret,
    keySecret: stored.keySecret,
    withdrawalId: stored.withdrawalId,
    payment: stored.payment,
    names: Object.keys(stored.webhooks),
    body: (name) => fs.readFileSync(path.join(DIR, `${name}.json`)),
    signature: (name) => stored.webhooks[name],
  };
}
