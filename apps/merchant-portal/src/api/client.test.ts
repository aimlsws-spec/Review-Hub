import type { InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it } from 'vitest'

import { apiClient } from './client'

/** Sends a request through the client's interceptors and returns what would have gone over the wire. */
async function sent(): Promise<InternalAxiosRequestConfig> {
  let captured: InternalAxiosRequestConfig | undefined
  await apiClient.get('/anything', {
    adapter: async (config) => {
      captured = config
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    },
  })
  return captured as InternalAxiosRequestConfig
}

describe('apiClient', () => {
  beforeEach(() => localStorage.clear())

  it('says which browser every request comes from, so the server can spot a new device', async () => {
    const first = await sent()
    const second = await sent()

    const id = first.headers['X-Device-ID']
    expect(id).toMatch(/^[a-f0-9]{32}$/)
    expect(second.headers['X-Device-ID']).toBe(id)
  })

  it('keeps the same id across page loads', async () => {
    localStorage.setItem('vk_device_id', 'abcdef0123456789abcdef0123456789')

    expect((await sent()).headers['X-Device-ID']).toBe('abcdef0123456789abcdef0123456789')
  })
})
