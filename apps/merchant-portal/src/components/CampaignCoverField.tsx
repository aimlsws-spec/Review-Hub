import { useEffect, useId, useState } from 'react'

import { uploadUrl } from '@/utils'

export const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const COVER_MAX_BYTES = 5 * 1024 * 1024

/** What is wrong with a chosen cover picture, or null when it can be uploaded (same rules as the API). */
export function coverFileError(file: File): string | null {
  if (!COVER_TYPES.includes(file.type)) return 'Choose a JPEG, PNG or WebP picture'
  if (file.size > COVER_MAX_BYTES) return 'The picture can be at most 5 MB'
  return null
}

/**
 * The campaign's cover image: the picture on its card in the app. Shows the chosen picture (or the saved one) as it
 * will look on the card, wide and cropped. Choosing a picture only keeps it here; the page uploads it once the
 * campaign is saved, since a new campaign has no id to attach it to before then.
 */
export function CampaignCoverField({
  savedPath,
  file,
  onChange,
  onRemoveSaved,
  removing = false,
}: {
  /** The cover already saved on the campaign, as the API returns it. */
  savedPath: string | null
  file: File | null
  onChange: (file: File | null) => void
  /** Takes the saved cover off. Left out, a saved cover can only be replaced. */
  onRemoveSaved?: () => void
  removing?: boolean
}) {
  const inputId = useId()
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  // The browser holds the chosen file under a temporary address, freed when the choice changes or the form closes.
  useEffect(() => {
    if (!file) {
      setPreview(null)
      return undefined
    }
    const address = URL.createObjectURL(file)
    setPreview(address)
    return () => URL.revokeObjectURL(address)
  }, [file])

  const shown = preview ?? (savedPath ? uploadUrl(savedPath) : null)

  const choose = (chosen: File | undefined) => {
    if (!chosen) return
    const problem = coverFileError(chosen)
    setError(problem)
    onChange(problem ? null : chosen)
  }

  return (
    <div>
      <label htmlFor={inputId} className="label">Cover image</label>
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          {shown ? (
            <img src={shown} alt="Cover preview" className="h-full w-full object-cover" />
          ) : (
            <span className="px-2 text-center text-xs text-gray-400">No cover yet</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            id={inputId}
            type="file"
            accept={COVER_TYPES.join(',')}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
            onChange={(event) => {
              choose(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          <p className="text-xs text-gray-500">
            Shown on the campaign card in the app. A wide photo of your shop, product or offer works best. JPEG, PNG or
            WebP, up to 5 MB.
          </p>
          {error && <p className="error-text" role="alert">{error}</p>}
          <div className="flex gap-2">
            {file && (
              <button type="button" className="btn-ghost btn-sm" onClick={() => onChange(null)}>
                Don't use this picture
              </button>
            )}
            {!file && savedPath && onRemoveSaved && (
              <button type="button" className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={onRemoveSaved} disabled={removing}>
                Remove cover
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
