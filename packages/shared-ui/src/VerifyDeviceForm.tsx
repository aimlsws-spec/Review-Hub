import { useEffect, useState } from 'react'

import { Spinner } from './Spinner'

interface VerifyDeviceFormProps {
  /** Masked email and/or phone the code went to, as the sign-in response lists them. */
  sentTo: string[]
  /** Finishes the sign-in. Rejects with the API error when the code is wrong or the sign-in expired. */
  onVerify: (code: string) => Promise<void>
  /** Sends a new code. Rejects with the API error, e.g. when asked again too soon. */
  onResend: () => Promise<void>
  /** Goes back to the email and password form. */
  onCancel: () => void
  /** Turns an API error into the message to show. */
  describeError: (error: unknown) => string
  /** Seconds before another code may be requested; the server refuses sooner. */
  resendCooldownSeconds?: number
}

const CODE_LENGTH = 6

/**
 * The second step of a sign-in from a browser this account has not used before: the server has sent a code to the
 * account's email and phone, and only finishes the sign-in once it comes back from this same browser.
 */
export function VerifyDeviceForm({
  sentTo,
  onVerify,
  onResend,
  onCancel,
  describeError,
  resendCooldownSeconds = 60,
}: VerifyDeviceFormProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(resendCooldownSeconds)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onVerify(code)
    } catch (err) {
      setError(describeError(err))
      setBusy(false)
    }
  }

  async function resend() {
    setError(null)
    try {
      await onResend()
      setCooldown(resendCooldownSeconds)
    } catch (err) {
      setError(describeError(err))
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Confirm it's you</h2>
        <p className="mt-2 text-sm text-gray-500">
          You are signing in from a new browser.{' '}
          {sentTo.length > 0 ? `Enter the code we sent to ${sentTo.join(' and ')}.` : 'Enter the code we sent you.'}
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="device-code" className="label">
          Verification code
        </label>
        <input
          id="device-code"
          className="input text-center text-lg tracking-[0.5em]"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          aria-invalid={!!error}
          aria-describedby={error ? 'device-code-error' : undefined}
          autoFocus
        />
        {error && (
          <p id="device-code-error" className="error-text" role="alert">
            {error}
          </p>
        )}
      </div>

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy && <Spinner size="sm" className="text-white" />}
        {busy ? 'Verifying…' : 'Verify and sign in'}
      </button>

      <div className="flex items-center justify-between text-sm">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
          Back
        </button>
        {cooldown > 0 ? (
          <span className="text-gray-400">Resend code in {cooldown}s</span>
        ) : (
          <button type="button" className="btn-ghost" onClick={resend} disabled={busy}>
            Resend code
          </button>
        )}
      </div>
    </form>
  )
}
