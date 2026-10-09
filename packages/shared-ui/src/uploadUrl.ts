/**
 * The address of an uploaded file (a campaign cover, an avatar). The API returns such files as a path from the
 * uploads folder, e.g. `/campaign/<uuid>.jpg`, served by the backend at `/uploads/...` beside the API, not under its
 * `/api/v1` prefix. A full address (a Google profile picture) is returned as it is.
 *
 * `apiBaseUrl` is the portal's API address: absolute (`http://localhost:3000/api/v1`) or, behind the dev proxy,
 * relative (`/api/v1`), in which case the file is asked for on the portal's own origin.
 */
export function resolveUploadUrl(path: string, apiBaseUrl: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const file = path.startsWith('/') ? path : `/${path}`
  const match = /^(https?:\/\/[^/]+)/i.exec(apiBaseUrl)
  return `${match ? match[1] : ''}/uploads${file}`
}
