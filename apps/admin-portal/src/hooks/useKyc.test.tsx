import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { adminApi } from '@/api/admin.api'

import { useKycFileUrl } from './useKyc'

vi.mock('@/api/admin.api', () => ({ adminApi: { getKycDocumentFile: vi.fn() } }))

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
)

describe('useKycFileUrl', () => {
  const createObjectURL = vi.fn(() => 'blob:kyc-file')
  const revokeObjectURL = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
    vi.mocked(adminApi.getKycDocumentFile).mockReset()
  })

  afterEach(() => vi.unstubAllGlobals())

  it('turns the downloaded file into a temporary URL and reports its type', async () => {
    vi.mocked(adminApi.getKycDocumentFile).mockResolvedValue({ data: new Blob(['x'], { type: 'image/png' }) } as never)

    const { result } = renderHook(() => useKycFileUrl('doc-1'), { wrapper })

    await waitFor(() => expect(result.current.url).toBe('blob:kyc-file'))
    expect(result.current.mimeType).toBe('image/png')
    expect(adminApi.getKycDocumentFile).toHaveBeenCalledWith('doc-1')
  })

  it('revokes the temporary URL when the viewer closes, so the document does not linger in memory', async () => {
    vi.mocked(adminApi.getKycDocumentFile).mockResolvedValue({ data: new Blob(['x'], { type: 'image/png' }) } as never)

    const { result, unmount } = renderHook(() => useKycFileUrl('doc-1'), { wrapper })
    await waitFor(() => expect(result.current.url).not.toBeNull())

    unmount()

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:kyc-file')
  })

  it('does not fetch anything when disabled, e.g. the document has no file', () => {
    const { result } = renderHook(() => useKycFileUrl('doc-1', false), { wrapper })

    expect(adminApi.getKycDocumentFile).not.toHaveBeenCalled()
    expect(result.current.url).toBeNull()
  })

  it('does not fetch when no document is selected', () => {
    renderHook(() => useKycFileUrl(null), { wrapper })

    expect(adminApi.getKycDocumentFile).not.toHaveBeenCalled()
  })

  it('reports an error instead of a URL when the download fails', async () => {
    vi.mocked(adminApi.getKycDocumentFile).mockRejectedValue(new Error('404'))

    const { result } = renderHook(() => useKycFileUrl('doc-1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.url).toBeNull()
  })
})
