import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { adminApi } from '@/api/admin.api'

import { useApproveRefundMutation, useRefundQueueQuery, useRejectRefundMutation } from './useRefundQueue'

vi.mock('@/api/admin.api', () => ({
  adminApi: {
    listPendingRefunds: vi.fn(),
    approveRefund: vi.fn(),
    rejectRefund: vi.fn(),
  },
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useRefundQueueQuery', () => {
  beforeEach(() => {
    vi.mocked(adminApi.listPendingRefunds).mockReset()
  })

  it('fetches the pending refund queue for the given page and limit', async () => {
    vi.mocked(adminApi.listPendingRefunds).mockResolvedValueOnce({
      data: { data: { data: [], total: 0, page: 1, limit: 20 } },
    } as never)

    const { result } = renderHook(() => useRefundQueueQuery({ page: 1, limit: 20 }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(adminApi.listPendingRefunds).toHaveBeenCalledWith({ page: 1, limit: 20 })
  })
})

describe('useApproveRefundMutation', () => {
  beforeEach(() => {
    vi.mocked(adminApi.approveRefund).mockReset()
  })

  it('approves the refund by id', async () => {
    vi.mocked(adminApi.approveRefund).mockResolvedValueOnce({ data: { data: { id: 'refund-1', status: 'APPROVED' } } } as never)
    const { result } = renderHook(() => useApproveRefundMutation(), { wrapper })

    result.current.mutate('refund-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(adminApi.approveRefund).toHaveBeenCalledWith('refund-1')
  })

  it('invokes the onSuccess callback after approval', async () => {
    vi.mocked(adminApi.approveRefund).mockResolvedValueOnce({ data: { data: { id: 'refund-1' } } } as never)
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useApproveRefundMutation(onSuccess), { wrapper })

    result.current.mutate('refund-1')

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
  })
})

describe('useRejectRefundMutation', () => {
  beforeEach(() => {
    vi.mocked(adminApi.rejectRefund).mockReset()
  })

  it('rejects the refund by id with the given reason', async () => {
    vi.mocked(adminApi.rejectRefund).mockResolvedValueOnce({ data: { data: { id: 'refund-1', status: 'REJECTED' } } } as never)
    const { result } = renderHook(() => useRejectRefundMutation(), { wrapper })

    result.current.mutate({ id: 'refund-1', reason: 'Bank mismatch' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(adminApi.rejectRefund).toHaveBeenCalledWith('refund-1', 'Bank mismatch')
  })
})
