import { describe, expect, it } from 'vitest'

import { fraudSignalDetail, fraudSignalLabel } from './fraud'

describe('fraudSignalLabel', () => {
  it('names each kind of signal in plain words', () => {
    expect(fraudSignalLabel({ type: 'DUPLICATE_SUBMISSION' })).toBe('Duplicate image')
    expect(fraudSignalLabel({ type: 'VPN_DETECTED' })).toBe('VPN / proxy')
    expect(fraudSignalLabel({ type: 'MULTIPLE_ACCOUNTS' })).toBe('Linked accounts')
  })

  it('is null for a flag raised before signal types were recorded', () => {
    expect(fraudSignalLabel({ type: null })).toBeNull()
    expect(fraudSignalLabel({})).toBeNull()
  })
})

describe('fraudSignalDetail', () => {
  describe('duplicate images', () => {
    it('says an identical file was reused, and which earlier submission it matches', () => {
      expect(fraudSignalDetail({ type: 'DUPLICATE_SUBMISSION', metadata: { kind: 'exact', matchedSubmissionId: 'abcdef12-3456' } })).toBe(
        'Identical file as submission abcdef12',
      )
    })

    it('says how close a look-alike is', () => {
      expect(
        fraudSignalDetail({ type: 'DUPLICATE_SUBMISSION', metadata: { kind: 'perceptual', matchedSubmissionId: 'abcdef12-3456', differingBits: 3 } }),
      ).toBe('Looks the same (3 of 64 bits differ) as submission abcdef12')
    })

    it('still says something useful when the match id is missing', () => {
      expect(fraudSignalDetail({ type: 'DUPLICATE_SUBMISSION', metadata: { kind: 'exact' } })).toBe('Identical file')
      expect(fraudSignalDetail({ type: 'DUPLICATE_SUBMISSION', metadata: { kind: 'perceptual' } })).toBe('Looks the same')
    })
  })

  describe('linked accounts', () => {
    it('counts the linked accounts in the campaign, in the singular and plural', () => {
      expect(fraudSignalDetail({ type: 'MULTIPLE_ACCOUNTS', metadata: { linkedUserIds: ['a'] } })).toBe('1 linked account in the same campaign');
      expect(fraudSignalDetail({ type: 'MULTIPLE_ACCOUNTS', metadata: { linkedUserIds: ['a', 'b'] } })).toBe('2 linked accounts in the same campaign');
    })

    it('says nothing for an empty list', () => {
      expect(fraudSignalDetail({ type: 'MULTIPLE_ACCOUNTS', metadata: { linkedUserIds: [] } })).toBeNull()
    })
  })

  describe('VPN or proxy', () => {
    it('shows the address and the lists it matched', () => {
      expect(fraudSignalDetail({ type: 'VPN_DETECTED', metadata: { ip: '203.0.113.9', sources: ['vpn', 'tor'] } })).toBe('203.0.113.9 · listed in vpn, tor')
    })

    it('copes with only one of the two', () => {
      expect(fraudSignalDetail({ type: 'VPN_DETECTED', metadata: { ip: '203.0.113.9' } })).toBe('203.0.113.9')
      expect(fraudSignalDetail({ type: 'VPN_DETECTED', metadata: { sources: ['vpn'] } })).toBe('listed in vpn')
    })

    it('says nothing when it has neither', () => {
      expect(fraudSignalDetail({ type: 'VPN_DETECTED', metadata: {} })).toBeNull()
    })
  })

  it('never throws on missing or unexpected metadata: older flags have none, and its shape depends on the check', () => {
    for (const metadata of [undefined, null, {}, { differingBits: 'three' }, { linkedUserIds: 'x' }, { sources: [1, 2] }, [] as unknown as Record<string, unknown>]) {
      for (const type of ['DUPLICATE_SUBMISSION', 'MULTIPLE_ACCOUNTS', 'VPN_DETECTED', 'AI_GENERATED', null] as const) {
        expect(() => fraudSignalDetail({ type, metadata })).not.toThrow()
      }
    }
  })

  it('has no detail for a signal type it does not describe', () => {
    expect(fraudSignalDetail({ type: 'AI_GENERATED', metadata: { anything: 1 } })).toBeNull()
  })
})
