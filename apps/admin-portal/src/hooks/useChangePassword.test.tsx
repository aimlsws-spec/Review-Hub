import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authApi } from '@/api/auth.api'

import { useChangePasswordMutation } from './useChangePassword'

vi.mock('@/api/auth.api', () => ({
  authApi: {
    changePassword: vi.fn(),
  },
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useChangePasswordMutation', () => {
  beforeEach(() => {
    vi.mocked(authApi.changePassword).mockReset()
  })

  it('calls authApi.changePassword with the current and new password', async () => {
    vi.mocked(authApi.changePassword).mockResolvedValueOnce({} as never)
    const { result } = renderHook(() => useChangePasswordMutation(), { wrapper })

    result.current.mutate({ currentPassword: 'old-pass', newPassword: 'new-pass' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(authApi.changePassword).toHaveBeenCalledWith('old-pass', 'new-pass')
  })

  it('invokes the onSuccess callback after a successful change', async () => {
    vi.mocked(authApi.changePassword).mockResolvedValueOnce({} as never)
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useChangePasswordMutation(onSuccess), { wrapper })

    result.current.mutate({ currentPassword: 'old-pass', newPassword: 'new-pass' })

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
  })

  it('invokes the onError callback with a readable message on failure', async () => {
    vi.mocked(authApi.changePassword).mockRejectedValueOnce({
      response: { data: { message: 'Current password is incorrect' } },
    })
    const onError = vi.fn()
    const { result } = renderHook(() => useChangePasswordMutation(undefined, onError), { wrapper })

    result.current.mutate({ currentPassword: 'wrong-pass', newPassword: 'new-pass' })

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Current password is incorrect'))
  })
})
