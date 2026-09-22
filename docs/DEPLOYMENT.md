# Deploying the backend to cPanel

This is for whoever deploys the backend to the cPanel server. The portals and the mobile app are deployed separately.

## What is and is not tested

| Checked | How |
|---|---|
| The deploy script's file steps produce the right folder layout | Dry run into a temporary folder (`DRY_RUN=1`) |
| `npm ci --workspace=apps/backend` accepts that layout | `npm ci --dry-run` on a copy of it: 1,050 packages, 501 without development packages |
| The app builds and starts against MySQL and Redis | The e2e test suite (`npm run test:e2e`) |
| **Not tested:** a real cPanel server | Nobody has run this on cPanel yet. **Do the first deploy on a staging copy.** |

## What the server needs

| Need | Notes |
|---|---|
| Node.js 20 or newer | Created through cPanel's **Setup Node.js App** |
| MySQL 8 | A database and a user with full rights on it |
| **Redis** | Required. Job queues, OTPs, caching and sessions all use it. Many shared cPanel plans do **not** include Redis. Check before anything else; if it is missing, use a VPS or a managed Redis. |
| Persistent disk | User uploads (KYC documents, proof screenshots) are stored on disk in `apps/backend/uploads/` |

## One-time setup

1. **Create the Node.js app** in cPanel (Setup Node.js App):
   - Application root: `/home/viralkar/backend` (this must match `DEPLOYPATH` in `.cpanel.yml`)
   - Startup file: `apps/backend/dist/main.js`
   - Mode: Production
2. **Create the database** and its user in cPanel's MySQL Databases.
3. **Create `apps/backend/.env` on the server by hand**, from `apps/backend/.env.example`. It is never deployed from git, and the deploy script refuses to run without it. At minimum:
   - `NODE_ENV=production`
   - `DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/DATABASE`
   - `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`: long random strings, at least 32 characters, different from each other and from development
   - `REDIS_HOST`, `REDIS_PORT` (and `REDIS_PASSWORD` if it has one)
   - `TRUST_PROXY=true`, because the app sits behind cPanel's web server. Without it every request looks like it came from the proxy's address, which breaks the per-IP fraud checks and rate limits.
   - Mail settings (`SMTP_*`) and, when you have them, SMS and push credentials
4. **Payments.** `PAYMENT_PROVIDER` can not be `mock` in production; the app refuses to start with it. Until live Razorpay keys are added, wallet recharge and payouts will not work in production.
5. **Connect the repository** in cPanel's Git Version Control, so `.cpanel.yml` is picked up.
6. **First database content.** After the first deploy, seed the roles, permissions and locations once, from `apps/backend`:
   `npx ts-node prisma/seed.ts`
   The seed creates an administrator with a well-known development password. **Change that password immediately**, or remove the account, before the site is reachable.

## Deploying

Push to the branch cPanel tracks, then use **Deploy HEAD Commit** in Git Version Control. `.cpanel.yml` runs `scripts/deploy-backend.sh`, which:

1. Removes the old `src`, `prisma` and `dist` folders (never `.env`, `uploads/` or `node_modules`)
2. Copies the new files in
3. Installs packages with `npm ci` for the backend only
4. Generates the Prisma client
5. Applies database migrations (`prisma migrate deploy`)
6. Builds
7. Restarts the app by touching `tmp/restart.txt`

It stops at the first error. If a **migration fails**, the app is still running the previous build. If the **build fails**, the previous `dist` is already gone (the Nest build clears it first), so the app is down until a good build is deployed.

To see what a deploy would do without running the installs, build and migrations, run on the server:

```
DRY_RUN=1 scripts/deploy-backend.sh /home/viralkar/backend
```

## Rolling back

Deploy the previous commit: check it out or revert on the branch, push, and deploy again. Database migrations are **not** undone. Write a migration that reverses a bad one, or restore from a backup taken before the deploy.

## Before each production deploy

- Take a database backup.
- Read the new migrations in `apps/backend/prisma/migrations/`. A migration that drops or rewrites a column can lose data.
- Deploy to staging first.

## Portals

The admin and merchant portals are static sites. Build each with the API address baked in, then upload the `dist/` folder to the web root for its domain:

```
VITE_API_URL=https://api.example.com/api/v1 npm run build --workspace=apps/admin-portal
VITE_API_URL=https://api.example.com/api/v1 npm run build --workspace=apps/merchant-portal
```
