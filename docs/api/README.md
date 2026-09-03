# API Documentation

The backend generates its own OpenAPI 3.0 spec from the actual controllers/DTOs at
boot time — there is no hand-maintained API reference to keep in sync, and there
shouldn't be one, since it would drift the moment a route changes.

## Live docs (preferred)

With the backend running (`npm run backend`), the interactive Swagger UI is at:

```
http://localhost:3000/api/docs
```

The raw spec (for importing into Postman, Insomnia, or any OpenAPI-aware tool) is at:

```
http://localhost:3000/api/docs-json
```

Click **Authorize** in the UI and paste a JWT access token (from `/auth/login` or
`/auth/register`) to call authenticated endpoints directly from the browser.

## `openapi.json` in this folder

[`openapi.json`](./openapi.json) is a point-in-time export of that same spec,
committed for anyone who wants to browse the API surface without running the
backend (e.g. generating a client SDK, reviewing endpoints in a PR). It reflects
whatever the backend looked like when it was last regenerated — **treat the live
`/api/docs-json` endpoint as the source of truth**, not this file, if the two ever
disagree.

To regenerate it after adding/changing endpoints:

```bash
cd apps/backend
npm run dev &          # or however you normally start it
curl -s http://localhost:3000/api/docs-json -o ../../docs/api/openapi.json
```

## Current surface (as of the last export)

162 documented paths, ~208 operations, grouped by tag:

| Tag | Endpoints |
|---|---|
| Authentication | 26 |
| Merchants | 38 |
| Admin - Merchants | 11 |
| Admin | 37 |
| Campaigns | 11 |
| Tasks | 9 |
| Submissions | 4 |
| Wallet | 7 |
| Withdrawals | 5 |
| Rewards | 1 |
| User KYC | 3 |
| Referrals | 3 |
| Notifications | 6 |
| Support | 13 |
| Settlements | 3 |
| Gamification | 3 |
| Marketplace | 3 |
| Fraud | 3 |
| Settings | 8 |
| Audit Logs | 1 |
| Health | 5 |

For what each module actually does and why it's structured this way, see
[`../architecture/README.md`](../architecture/README.md).
