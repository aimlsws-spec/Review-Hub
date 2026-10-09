import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { toast } from 'react-hot-toast'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { merchantApi } from '@/api/merchant.api'
import { loadRazorpayCheckout, openRazorpayCheckout } from '@/utils/razorpay'

import { useWalletMutations } from './useWallet'

vi.mock('@/api/merchant.api', () => ({
  merchantApi: {
    createRecharge: vi.fn(),
    verifyRecharge: vi.fn(),
    simulateRecharge: vi.fn(),
  },
}))
vi.mock('@/utils/razorpay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/razorpay')>()),
  loadRazorpayCheckout: vi.fn(),
  openRazorpayCheckout: vi.fn(),
}))
vi.mock('react-hot-toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

const order = (keyId?: string) =>
  ({ data: { data: { razorpayOrderId: 'order_1', amount: 1000, currency: 'INR', keyId } } }) as never

describe('useWalletMutations recharge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(loadRazorpayCheckout).mockResolvedValue(undefined as never)
    vi.stubEnv('VITE_RAZORPAY_KEY_ID', '')
  })

  it('opens Checkout with the key the backend created the order under', async () => {
    vi.mocked(merchantApi.createRecharge).mockResolvedValueOnce(order('rzp_test_from_backend'))
    vi.stubEnv('VITE_RAZORPAY_KEY_ID', 'rzp_test_stale_copy')

    const { result } = renderHook(() => useWalletMutations('merchant-1', null), { wrapper })
    act(() => result.current.rechargeMutation.mutate(1000))

    await waitFor(() => expect(openRazorpayCheckout).toHaveBeenCalled())
    expect(vi.mocked(openRazorpayCheckout).mock.calls[0][0]).toMatchObject({
      key: 'rzp_test_from_backend',
      order_id: 'order_1',
      amount: 100000,
    })
  })

  it('offers only card, UPI and netbanking: no EMI, pay later or wallets', async () => {
    vi.mocked(merchantApi.createRecharge).mockResolvedValueOnce(order('rzp_test_from_backend'))

    const { result } = renderHook(() => useWalletMutations('merchant-1', null), { wrapper })
    act(() => result.current.rechargeMutation.mutate(1000))

    await waitFor(() => expect(openRazorpayCheckout).toHaveBeenCalled())
    expect(vi.mocked(openRazorpayCheckout).mock.calls[0][0].method).toEqual({
      card: true,
      upi: true,
      netbanking: true,
      wallet: false,
      emi: false,
      cardless_emi: false,
      paylater: false,
    })
  })

  it('falls back to the portal setting when the backend does not name a key', async () => {
    vi.mocked(merchantApi.createRecharge).mockResolvedValueOnce(order())
    vi.stubEnv('VITE_RAZORPAY_KEY_ID', 'rzp_test_env')

    const { result } = renderHook(() => useWalletMutations('merchant-1', null), { wrapper })
    act(() => result.current.rechargeMutation.mutate(1000))

    await waitFor(() => expect(openRazorpayCheckout).toHaveBeenCalled())
    expect(vi.mocked(openRazorpayCheckout).mock.calls[0][0]).toMatchObject({ key: 'rzp_test_env' })
  })

  it('says payment is not set up, and does not open a Checkout that would fail, when there is no key at all', async () => {
    vi.mocked(merchantApi.createRecharge).mockResolvedValueOnce(order(''))

    const { result } = renderHook(() => useWalletMutations('merchant-1', null), { wrapper })
    act(() => result.current.rechargeMutation.mutate(1000))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/not set up/i)))
    expect(openRazorpayCheckout).not.toHaveBeenCalled()
  })
})
