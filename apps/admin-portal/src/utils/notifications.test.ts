import { describe, expect, it } from 'vitest'

import type { AudienceLocation } from '@/types'

import {
  audienceFormError,
  buildAudienceFilter,
  describeAudience,
  EMPTY_AUDIENCE_FORM,
  findUnsupportedPlaceholders,
  renderPreview,
  toLocalInputValue,
} from './notifications'

const locations: AudienceLocation[] = [
  { id: 's1', name: 'Gujarat', cities: [{ id: 'c1', name: 'Ahmedabad' }] },
  { id: 's2', name: 'Maharashtra', cities: [{ id: 'c2', name: 'Pune' }] },
]

describe('placeholders', () => {
  it('flags anything other than firstName', () => {
    expect(findUnsupportedPlaceholders('Hi {{firstName}}, you earned {{amount}} in {{ city }}')).toEqual(['amount', 'city'])
    expect(findUnsupportedPlaceholders('Hi {{firstName}}')).toEqual([])
    expect(findUnsupportedPlaceholders('No placeholders')).toEqual([])
  })

  it('previews a message with a sample name', () => {
    expect(renderPreview('Hi {{firstName}}!')).toBe('Hi Priya!')
    expect(renderPreview('Hi {{ firstName }}!', 'Arjun')).toBe('Hi Arjun!')
  })

  it('leaves an unsupported placeholder visible in the preview', () => {
    expect(renderPreview('You earned {{amount}}')).toBe('You earned {{amount}}')
  })
})

describe('buildAudienceFilter', () => {
  it('sends an empty filter for an untouched form, meaning everyone', () => {
    expect(buildAudienceFilter(EMPTY_AUDIENCE_FORM)).toEqual({})
  })

  it('turns each filled field into its API field and drops the rest', () => {
    const filter = buildAudienceFilter({
      ...EMPTY_AUDIENCE_FORM,
      stateId: 's1',
      cityId: 'c1',
      gender: 'FEMALE',
      minAge: '18',
      maxAge: '35',
      minLevel: '2',
      kyc: 'yes',
      joinedWithinDays: '30',
    })

    expect(filter).toEqual({
      stateIds: ['s1'],
      cityIds: ['c1'],
      gender: 'FEMALE',
      minAge: 18,
      maxAge: 35,
      minLevel: 2,
      kycVerified: true,
      joinedWithinDays: 30,
    })
  })

  it('maps KYC "not verified" to false, which is different from not filtering', () => {
    expect(buildAudienceFilter({ ...EMPTY_AUDIENCE_FORM, kyc: 'no' })).toEqual({ kycVerified: false })
  })

  it.each(['', '  ', '0', '-3', '2.5', 'abc'])('ignores an unusable number field (%j) instead of sending nonsense', (raw) => {
    expect(buildAudienceFilter({ ...EMPTY_AUDIENCE_FORM, minAge: raw, inactiveForDays: raw })).toEqual({})
  })
})

describe('audienceFormError', () => {
  it('catches a minimum above the maximum', () => {
    expect(audienceFormError({ minAge: 40, maxAge: 20 })).toMatch(/age/i)
    expect(audienceFormError({ minLevel: 9, maxLevel: 2 })).toMatch(/level/i)
  })

  it('accepts equal or one-sided ranges', () => {
    expect(audienceFormError({ minAge: 25, maxAge: 25 })).toBeNull()
    expect(audienceFormError({ minAge: 25 })).toBeNull()
    expect(audienceFormError({})).toBeNull()
  })
})

describe('describeAudience', () => {
  it('says Everyone for no filters', () => {
    expect(describeAudience({}, locations)).toBe('Everyone')
  })

  it('describes the filters in plain words', () => {
    expect(
      describeAudience(
        { stateIds: ['s1'], cityIds: ['c1'], gender: 'FEMALE', minAge: 18, maxAge: 35, kycVerified: true, inactiveForDays: 30 },
        locations,
      ),
    ).toBe('Gujarat · Ahmedabad · Female · Age 18–35 · KYC verified · Inactive for 30+ days')
  })

  it('handles one-sided ranges and recent joiners', () => {
    expect(describeAudience({ minAge: 18, maxLevel: 3, joinedWithinDays: 7, kycVerified: false }, locations)).toBe(
      'Age 18+ · Level up to 3 · Not KYC verified · Joined in the last 7 days',
    )
  })

  it('falls back to a neutral name for a location it cannot look up', () => {
    expect(describeAudience({ stateIds: ['gone'] }, locations)).toBe('Selected state')
    expect(describeAudience({ cityIds: ['gone'] })).toBe('Selected city')
  })
})

describe('toLocalInputValue', () => {
  it('formats a date the way a datetime-local input expects, in local time', () => {
    expect(toLocalInputValue(new Date(2026, 8, 5, 7, 3))).toBe('2026-09-05T07:03')
  })
})
