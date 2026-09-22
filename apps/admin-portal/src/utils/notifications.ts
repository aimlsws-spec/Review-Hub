import type { AudienceFilter, AudienceGender, AudienceLocation } from '@/types'

/** Placeholders the backend fills in when it sends. Anything else would reach users as literal "{{text}}". */
export const SUPPORTED_PLACEHOLDERS = ['firstName'] as const

const PLACEHOLDER_PATTERN = /\{\{\s*(\w+)\s*\}\}/g

/** Placeholders in the text that we cannot fill in, so the form can warn before the server refuses. */
export function findUnsupportedPlaceholders(text: string): string[] {
  const supported: readonly string[] = SUPPORTED_PLACEHOLDERS
  const found = new Set<string>()
  for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
    if (!supported.includes(match[1])) found.add(match[1])
  }
  return [...found]
}

/** Shows what a message will look like for one person, using a sample name. */
export function renderPreview(text: string, firstName = 'Priya'): string {
  return text.replace(PLACEHOLDER_PATTERN, (whole, name: string) => (name === 'firstName' ? firstName : whole))
}

/** The audience form as typed: everything is a string so fields can be empty or half-filled. */
export interface AudienceForm {
  stateId: string
  cityId: string
  gender: AudienceGender | ''
  minAge: string
  maxAge: string
  minLevel: string
  maxLevel: string
  kyc: '' | 'yes' | 'no'
  joinedWithinDays: string
  inactiveForDays: string
}

export const EMPTY_AUDIENCE_FORM: AudienceForm = {
  stateId: '',
  cityId: '',
  gender: '',
  minAge: '',
  maxAge: '',
  minLevel: '',
  maxLevel: '',
  kyc: '',
  joinedWithinDays: '',
  inactiveForDays: '',
}

/** A whole number above zero, or undefined for an empty or invalid field. */
function positiveInt(raw: string): number | undefined {
  const value = Number(raw.trim())
  return raw.trim() !== '' && Number.isInteger(value) && value > 0 ? value : undefined
}

/** Turns the form into the filter the API takes, leaving out every field the admin did not fill in. */
export function buildAudienceFilter(form: AudienceForm): AudienceFilter {
  const filter: AudienceFilter = {}
  if (form.stateId) filter.stateIds = [form.stateId]
  if (form.cityId) filter.cityIds = [form.cityId]
  if (form.gender) filter.gender = form.gender
  const numbers = {
    minAge: positiveInt(form.minAge),
    maxAge: positiveInt(form.maxAge),
    minLevel: positiveInt(form.minLevel),
    maxLevel: positiveInt(form.maxLevel),
    joinedWithinDays: positiveInt(form.joinedWithinDays),
    inactiveForDays: positiveInt(form.inactiveForDays),
  }
  for (const [key, value] of Object.entries(numbers)) {
    if (value !== undefined) (filter as Record<string, number>)[key] = value
  }
  if (form.kyc) filter.kycVerified = form.kyc === 'yes'
  return filter
}

/** A problem that makes the filters contradict themselves, or null when they are fine. */
export function audienceFormError(filter: AudienceFilter): string | null {
  if (filter.minAge !== undefined && filter.maxAge !== undefined && filter.minAge > filter.maxAge) {
    return 'Minimum age cannot be above maximum age'
  }
  if (filter.minLevel !== undefined && filter.maxLevel !== undefined && filter.minLevel > filter.maxLevel) {
    return 'Minimum level cannot be above maximum level'
  }
  return null
}

const GENDER_LABELS: Record<AudienceGender, string> = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' }

function describeRange(label: string, min?: number, max?: number): string | null {
  if (min !== undefined && max !== undefined) return `${label} ${min}–${max}`
  if (min !== undefined) return `${label} ${min}+`
  if (max !== undefined) return `${label} up to ${max}`
  return null
}

/** The audience in plain words for a table row, e.g. "Gujarat · Female · Age 18–35". */
export function describeAudience(audience: AudienceFilter, locations: AudienceLocation[] = []): string {
  const nameOf = (ids: string[] | undefined, lookup: (id: string) => string | undefined, fallback: string) =>
    ids?.length ? ids.map((id) => lookup(id) ?? fallback).join(', ') : null

  const parts = [
    nameOf(audience.stateIds, (id) => locations.find((s) => s.id === id)?.name, 'Selected state'),
    nameOf(audience.cityIds, (id) => locations.flatMap((s) => s.cities).find((c) => c.id === id)?.name, 'Selected city'),
    audience.gender ? GENDER_LABELS[audience.gender] : null,
    describeRange('Age', audience.minAge, audience.maxAge),
    describeRange('Level', audience.minLevel, audience.maxLevel),
    audience.kycVerified === undefined ? null : audience.kycVerified ? 'KYC verified' : 'Not KYC verified',
    audience.joinedWithinDays ? `Joined in the last ${audience.joinedWithinDays} days` : null,
    audience.inactiveForDays ? `Inactive for ${audience.inactiveForDays}+ days` : null,
  ].filter((part): part is string => part !== null)

  return parts.length > 0 ? parts.join(' · ') : 'Everyone'
}

/** "2026-09-19T14:05" in the browser's own time zone, the format a datetime-local input wants. */
export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
