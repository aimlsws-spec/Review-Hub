import { Modal, Spinner } from '@viralkar/shared-ui'
import { isAxiosError } from 'axios'
import { useState } from 'react'

import { POLICY_DOCUMENTS } from '@/constants'
import { useContentPage } from '@/hooks/useLegal'
import { getApiErrorMessage } from '@/utils'

/** Shows one legal document as published in the admin portal's CMS. */
function PolicyDocumentModal({ slug, onClose }: { slug: string | null; onClose: () => void }) {
  const page = useContentPage(slug)
  const knownTitle = POLICY_DOCUMENTS.find((d) => d.slug === slug)?.title

  let body: React.ReactNode
  if (page.isLoading) {
    body = (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  } else if (page.isError) {
    body = (
      <p className="text-sm text-gray-600">
        {isAxiosError(page.error) && page.error.response?.status === 404
          ? 'This document has not been published yet. Please check again later.'
          : getApiErrorMessage(page.error)}
      </p>
    )
  } else {
    body = <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{page.data?.content}</p>
  }

  return (
    <Modal open={slug !== null} onClose={onClose} title={page.data?.title ?? knownTitle ?? 'Policy'} size="xl">
      {body}
    </Modal>
  )
}

/** "[prefix] Terms & Conditions, Privacy Policy and Reward Policy", each title opening that document. */
export function PolicyLinks({ prefix }: { prefix: string }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null)

  return (
    <>
      <span>
        {prefix}{' '}
        {POLICY_DOCUMENTS.map((document, i) => (
          <span key={document.slug}>
            <button
              type="button"
              className="font-medium text-primary-600 underline hover:text-primary-700"
              onClick={() => setOpenSlug(document.slug)}
            >
              {document.title}
            </button>
            {i < POLICY_DOCUMENTS.length - 2 ? ', ' : i === POLICY_DOCUMENTS.length - 2 ? ' and ' : ''}
          </span>
        ))}
      </span>
      <PolicyDocumentModal slug={openSlug} onClose={() => setOpenSlug(null)} />
    </>
  )
}
