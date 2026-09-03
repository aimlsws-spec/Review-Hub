import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { merchantApi } from '@/api/merchant.api'

import { useCreateRefundMutation, useRefundsQuery } from './useRefunds'

vi.mock('@/api/merchant.api', () => ({
  merchantApi: {
    getRefunds: vi.fn(),
    createRefund: vi.fn(),
  },
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useRefundsQuery', () => {
  beforeEach(() => {
    vi.mocked(merchantApi.getRefunds).mockReset()
  })

  it('does not query when merchantId is undefined', () => {
    renderHook(() => useRefundsQuery(undefined, 1, 10), { wrapper })
    expect(merchantApi.getRefunds).not.toHaveBeenCalled()
  })

  it('fetches refunds for the given merchant, page, and limit', async () => {
    vi.mocked(merchantApi.getRefunds).mockResolvedValueOnce({
      data: { data: { data: [], total: 0, page: 1, limit: 10 } },
    } as never)

    const { result } = renderHook(() => useRefundsQuery('merchant-1', 1, 10), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(merchantApi.getRefunds).toHaveBeenCalledWith('merchant-1', { page: 1, limit: 10 })
  })
})

describe('useCreateRefundMutation', () => {
  beforeEach(() => {
    vi.mocked(merchantApi.createRefund).mockReset()
  })

  it('submits the refund request with the given data', async () => {
    vi.mocked(merchantApi.createRefund).mockResolvedValueOnce({ data: { data: { id: 'refund-1' } } } as never)
    const { result } = renderHook(() => useCreateRefundMutation('merchant-1'), { wrapper })

    result.current.mutate({ amount: 1500, bankAccountId: 'bank-1', reason: 'Test' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(merchantApi.createRefund).toHaveBeenCalledWith('merchant-1', { amount: 1500, bankAccountId: 'bank-1', reason: 'Test' })
  })

  it('invokes the onSuccess callback after a successful request', async () => {
    vi.mocked(merchantApi.createRefund).mockResolvedValueOnce({ data: { data: { id: 'refund-1' } } } as never)
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useCreateRefundMutation('merchant-1', onSuccess), { wrapper })

    result.current.mutate({ amount: 1500, bankAccountId: 'bank-1' })

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
  })

  it('does not call onSuccess when the request fails', async () => {
    vi.mocked(merchantApi.createRefund).mockRejectedValueOnce(new Error('Insufficient wallet balance'))
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useCreateRefundMutation('merchant-1', onSuccess), { wrapper })

    result.current.mutate({ amount: 999999, bankAccountId: 'bank-1' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
