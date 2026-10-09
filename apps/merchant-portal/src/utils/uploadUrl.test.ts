import { resolveUploadUrl } from '@viralkar/shared-ui'
import { describe, expect, it } from 'vitest'


describe('resolveUploadUrl', () => {
  it('puts an uploaded path on the API server, beside the API rather than under /api/v1', () => {
    expect(resolveUploadUrl('/campaign/3f2a.jpg', 'http://localhost:3000/api/v1')).toBe('http://localhost:3000/uploads/campaign/3f2a.jpg')
  })

  it('keeps it on the portal origin when the API address is relative (dev proxy)', () => {
    expect(resolveUploadUrl('/campaign/3f2a.jpg', '/api/v1')).toBe('/uploads/campaign/3f2a.jpg')
  })

  it('adds a missing leading slash', () => {
    expect(resolveUploadUrl('campaign/3f2a.jpg', 'https://api.viralkar.in/api/v1')).toBe('https://api.viralkar.in/uploads/campaign/3f2a.jpg')
  })

  it('returns a full address unchanged', () => {
    expect(resolveUploadUrl('https://lh3.googleusercontent.com/a/photo', 'http://localhost:3000/api/v1')).toBe(
      'https://lh3.googleusercontent.com/a/photo',
    )
  })
})
