import { describe, expect, it } from 'vitest'

import {
  formatCurrency,
  formatFileSize,
  getApiErrorMessage,
  getInitials,
  getStatusColor,
  truncate,
} from './index'

describe('formatCurrency', () => {
  it('formats a number as INR currency', () => {
    expect(formatCurrency(1234.5)).toBe('₹1,234.50')
  })

  it('parses a numeric string before formatting', () => {
    expect(formatCurrency('999')).toBe('₹999.00')
  })
})

describe('getInitials', () => {
  it('uppercases the first letter of each name', () => {
    expect(getInitials('jane', 'doe')).toBe('JD')
  })
})

describe('truncate', () => {
  it('leaves short strings untouched', () => {
    expect(truncate('short', 10)).toBe('short')
  })

  it('truncates and appends an ellipsis past the limit', () => {
    expect(truncate('a fairly long string', 7)).toBe('a fairl...')
  })
})

describe('getStatusColor', () => {
  it('maps known statuses to their badge class', () => {
    expect(getStatusColor('APPROVED')).toBe('badge-green')
    expect(getStatusColor('SUSPENDED')).toBe('badge-red')
    expect(getStatusColor('PENDING')).toBe('badge-yellow')
  })

  it('falls back to gray for an unknown status', () => {
    expect(getStatusColor('SOMETHING_UNMAPPED')).toBe('badge-gray')
  })
})

describe('formatFileSize', () => {
  it('renders bytes under 1KB as B', () => {
    expect(formatFileSize(512)).toBe('512 B')
  })

  it('renders sizes under 1MB as KB', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB')
  })

  it('renders sizes at or above 1MB as MB', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})

describe('getApiErrorMessage', () => {
  it('extracts the message from an axios-style error response', () => {
    const error = { response: { data: { message: 'Invalid credentials' } } }
    expect(getApiErrorMessage(error)).toBe('Invalid credentials')
  })

  it('falls back to a plain Error message', () => {
    expect(getApiErrorMessage(new Error('boom'))).toBe('boom')
  })

  it('falls back to a generic message for unrecognized input', () => {
    expect(getApiErrorMessage(null)).toBe('An unexpected error occurred')
  })
})
