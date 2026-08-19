export interface RazorpayCheckoutOptions {
  key: string
  amount: number
  currency: string
  order_id: string
  name: string
  description?: string
  prefill?: { name?: string; email?: string; contact?: string }
  theme?: { color?: string }
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
