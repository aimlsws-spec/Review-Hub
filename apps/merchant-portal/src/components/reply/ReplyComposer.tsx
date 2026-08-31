import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/utils'

import { AISuggestions } from './AISuggestions'
import { ReplyPreview } from './ReplyPreview'
import { ReplyTemplates } from './ReplyTemplates'

const MAX_CHARS = 1000

interface ReplyComposerProps {
  reviewerName: string
  initialValue?: string
  onPublish:    (text: string) => void
  onSaveDraft:  (text: string) => void
  onCancel:     () => void
  disabled?:    boolean
}

export function ReplyComposer({
  reviewerName,
  initialValue = '',
  onPublish,
  onSaveDraft,
  onCancel,
  disabled = false,
}: ReplyComposerProps) {
  const [text, setText]               = useState(initialValue)
  const [error, setError]             = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const textareaRef                   = useRef<HTMLTextAreaElement>(null)

  // Auto-expand
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 96)}px`
  }, [text])

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const remaining   = MAX_CHARS - text.length
  const isOverLimit = remaining < 0
  const isEmpty     = text.trim().length === 0

  function validate(): boolean {
    if (isEmpty)     { setError('Reply cannot be empty.');                  return false }
    if (isOverLimit) { setError(`Reply exceeds ${MAX_CHARS} characters.`); return false }
    setError('')
    return true
  }

  const handleInsert = useCallback((snippet: string) => {
    const el    = textareaRef.current
    const start = el?.selectionStart ?? text.length
    const end   = el?.selectionEnd   ?? text.length
    const next  = text.slice(0, start) + snippet + text.slice(end)
    setText(next)
    setError('')
    setShowPreview(false)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + snippet.length, start + snippet.length)
    })
  }, [text])

  function handleChange(val: string) {
    setText(val)
    if (error)       setError('')
    if (showPreview) setShowPreview(false)
  }

  function handlePublish() {
    if (!validate()) return
    if (!showPreview) { setShowPreview(true); return }
    onPublish(text.trim())
  }

  return (
    <div className="space-y-3">
      <ReplyTemplates onInsert={handleInsert} />
      <AISuggestions reviewerName={reviewerName} onUse={handleInsert} />

      {/* Textarea */}
      <div>
        <div
          className={cn(
            'rounded-xl border bg-white transition-colors duration-150',
            error
              ? 'border-red-300 ring-1 ring-red-300'
              : 'border-gray-300 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500',
          )}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Write a thoughtful response to your customer..."
            rows={4}
            className="block w-full resize-none overflow-hidden rounded-t-xl bg-transparent px-4 pt-3 pb-1 text-sm leading-relaxed text-gray-900 placeholder-gray-400 focus:outline-none"
            aria-label="Reply text"
            aria-describedby={error ? 'reply-error' : 'reply-counter'}
          />
          <div className="flex items-center justify-end border-t border-gray-100 px-4 py-2">
            <span
              id="reply-counter"
              className={cn(
                'text-[11px] tabular-nums transition-colors duration-150',
                isOverLimit
                  ? 'font-semibold text-red-500'
                  : remaining <= 100
                  ? 'text-amber-500'
                  : 'text-gray-400',
              )}
              aria-live="polite"
              aria-label={`${text.length} of ${MAX_CHARS} characters used`}
            >
              {text.length} / {MAX_CHARS}
            </span>
          </div>
        </div>

        {error && (
          <p id="reply-error" role="alert" className="mt-1.5 text-xs text-red-600">
            {error}
          </p>
        )}
      </div>

      {/* Preview */}
      {showPreview && !isEmpty && !isOverLimit && (
        <ReplyPreview text={text} onBack={() => setShowPreview(false)} />
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePublish}
          disabled={isEmpty || isOverLimit || disabled}
          className="btn-primary btn-sm flex-1"
          aria-label={showPreview ? 'Confirm and publish reply' : 'Preview and publish reply'}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {disabled ? 'Publishing…' : showPreview ? 'Confirm & Publish' : 'Publish Reply'}
        </button>

        <button
          type="button"
          onClick={() => { if (validate()) onSaveDraft(text) }}
          disabled={isEmpty || disabled}
          className="btn-secondary btn-sm"
          aria-label="Save reply as draft"
        >
          Save Draft
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="btn-ghost btn-sm"
          aria-label="Cancel reply"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
