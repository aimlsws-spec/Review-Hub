export type RazorpayMethod = 'card' | 'upi' | 'netbanking' | 'wallet' | 'emi' | 'cardless_emi' | 'paylater'

/**
 * A wallet top-up is paid only by card, UPI or netbanking. EMI and pay-later turn a prepaid campaign budget into the
 * merchant's debt, and wallet and EMI payments are the ones most often reversed or settled late.
 */
export const WALLET_TOP_UP_METHODS: Partial<Record<RazorpayMethod, boolean>> = {
  card: true,
  upi: true,
  netbanking: true,
  wallet: false,
  emi: false,
  cardless_emi: false,
  paylater: false,
}

export interface RazorpayCheckoutOptions {
  key: string
  amount: number
  currency: string
  order_id: string
  name: string
  description?: string
  prefill?: { name?: string; email?: string; contact?: string }
  theme?: { color?: string }
  /** Payment methods to show (true) or hide (false). One left out keeps Razorpay's default. */
  method?: Partial<Record<RazorpayMethod, boolean>>
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void
  modal?: { ondismiss?: () => void }
}

interface RazorpayCheckout {
  open: () => void
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckout
  }
}

const CHECKOUT_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

let loadPromise: Promise<void> | null = null

/** Loads Razorpay's Checkout.js once and caches the in-flight promise for concurrent callers. */
export function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = CHECKOUT_SCRIPT_SRC
    script.onload = () => resolve()
    script.onerror = () => {
      loadPromise = null
      reject(new Error('Failed to load Razorpay Checkout'))
    }
    document.body.appendChild(script)
  })

  return loadPromise
}

export function openRazorpayCheckout(options: RazorpayCheckoutOptions) {
  if (!window.Razorpay) throw new Error('Razorpay Checkout is not loaded')
  new window.Razorpay(options).open()
}
