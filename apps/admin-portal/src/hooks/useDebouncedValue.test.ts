import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDebouncedValue } from './useDebouncedValue'

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('starts with the initial value', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 400))
    expect(result.current).toBe('a')
  })

  it('holds the old value until the input has been still for the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 400), { initialProps: { value: 'a' } })

    rerender({ value: 'b' })
    act(() => vi.advanceTimersByTime(399))
    expect(result.current).toBe('a')

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('b')
  })

  it('restarts the wait on every change, so only the last value in a burst gets through', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 400), { initialProps: { value: 'a' } })

    rerender({ value: 'b' })
    act(() => vi.advanceTimersByTime(300))
    rerender({ value: 'c' })
    act(() => vi.advanceTimersByTime(300))
    expect(result.current).toBe('a')

    act(() => vi.advanceTimersByTime(100))
    expect(result.current).toBe('c')
  })
})
