const STORAGE_KEY = 'vk_device_id'

let memoryFallback: string | null = null

/**
 * A stable id for this browser, sent as X-Device-ID so the backend can recognise a device it has seen before and
 * ask for a code when an account signs in from a new one. Kept in localStorage; when storage is unavailable (private
 * mode, blocked site data) it lasts for this page load only, which just means the next sign-in asks for a code again.
 */
export function getDeviceId(): string {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved) return saved
    const created = newId()
    window.localStorage.setItem(STORAGE_KEY, created)
    return created
  } catch {
    memoryFallback ??= newId()
    return memoryFallback
  }
}

/** 32 hex characters: within the backend's accepted id format (8 to 128 of [A-Za-z0-9._:-]). */
function newId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
