import { Modal, Spinner } from '@reviewhub/shared-ui'
import { toast } from 'react-hot-toast'

import { useAuth } from '@/contexts/AuthContext'
import { useAcceptPoliciesMutation, usePolicyStatus } from '@/hooks/useLegal'
import { getApiErrorMessage } from '@/utils'

import { PolicyLinks } from './PolicyLinks'

/**
 * Asks a signed-in merchant to accept the legal documents before using the portal (FR-008): after a Google sign-up,
 * which has no consent checkbox, or when a document changed since they last accepted it. Closing it signs out,
 * since the portal can not be used without accepting.
 */
export function PolicyGate() {
  const { logout } = useAuth()
  const status = usePolicyStatus()
  const accept = useAcceptPoliciesMutation()

  const pending = (status.data ?? []).filter((p) => p.acceptedAt === null)
  if (pending.length === 0) return null

  return (
    <Modal
      open
      onClose={logout}
      title="Before you continue"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={logout} disabled={accept.isPending}>
            Not now, sign out
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={accept.isPending}
            onClick={() => accept.mutate(undefined, { onError: (err) => toast.error(getApiErrorMessage(err)) })}
          >
            {accept.isPending && <Spinner size="sm" className="text-white" />}
            I accept
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-gray-700">
        <p>Please review and accept our {pending.map((p) => p.title).join(', ')} to keep using the portal.</p>
        <p>
          <PolicyLinks prefix="Read the" />
        </p>
      </div>
    </Modal>
  )
}
