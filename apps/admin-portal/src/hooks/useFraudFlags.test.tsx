import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { adminApi } from '@/api/admin.api'

import { useHighRiskDevicesQuery } from './useFraudFlags'

vi.mock('@/api/admin.api', () => ({
  adminApi: {
    listHighRiskDevices: vi.fn(),
  },
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useHighRiskDevicesQuery', () => {
  beforeEach(() => {
    vi.mocked(adminApi.listHighRiskDevices).mockReset()
  })

  it('fetches devices above the given risk threshold', async () => {
    vi.mocked(adminApi.listHighRiskDevices).mockResolvedValueOnce({
      data: { data: { data: [], total: 0, page: 1, limit: 20 } },
    } as never)

    const { result } = renderHook(() => useHighRiskDevicesQuery({ page: 1, limit: 20, minRiskScore: 40 }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(adminApi.listHighRiskDevices).toHaveBeenCalledWith({ page: 1, limit: 20, minRiskScore: 40 })
  })
})
