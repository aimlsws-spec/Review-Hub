# VIRAL KAR — Monorepo

AI-powered digital engagement & rewards platform. Users complete campaign tasks and earn wallet rewards; merchants run campaigns; admins manage the platform.

## Apps

| App | Path | Stack |
|---|---|---|
| Backend API | `apps/backend` | NestJS, MySQL (Prisma), Redis, RabbitMQ |
| Admin Portal | `apps/admin-portal` | React, TypeScript, Vite |
| Merchant Portal | `apps/merchant-portal` | React, TypeScript, Vite |
| Mobile App | `apps/mobile` | Flutter |
| AI Services | `apps/ai-services` | Python, FastAPI |

| Package | Path | Description |
|---|---|---|
| `@reviewhub/shared-ui` | `packages/shared-ui` | Shared React components used by both portals |

## Prerequisites

- [Node.js](https://nodejs.org) 20+ and npm 10+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — for MySQL, Redis, RabbitMQ (free for individuals/small teams)
- [Flutter SDK](https://docs.flutter.dev/get-started/install) — only if you're working on `apps/mobile`
- [Python](https://www.python.org/) 3.12+ — only if you're working on `apps/ai-services`

Nothing else is required and nothing here needs a paid account to run locally. A few *optional* integrations (SMTP, Twilio, Razorpay, Google/Apple login, cloud LLM providers) can be added later — every one of them degrades gracefully when left unconfigured, so you can develop and test the whole app without any of them.

## 1. Start the backing services

**First, check whether you already have a native MySQL running locally** (common on a dev machine that's been used for other projects). If `mysql --version` works or something is already listening on port 3306, you likely do — in that case, keep using it and just point `DATABASE_URL` at it (see `apps/backend/.env.example`); don't let Docker's MySQL fight it for the port.

From the repo root:

```bash
docker compose up -d
```

This starts MySQL (on port **3307**, deliberately not 3306, so it never collides with a native install), Redis, and RabbitMQ with fixed dev credentials (see `docker-compose.yml`). Check they're healthy:

```bash
docker compose ps
```

If you're already using a native MySQL on 3306, you can skip the `mysql` service entirely and start just the other two:

```bash
docker compose up -d redis rabbitmq
```

RabbitMQ's management UI is at [http://localhost:15672](http://localhost:15672) (user `viral_kar` / password `viral_kar_dev`) if you want to inspect queues.

To stop everything: `docker compose down`. To wipe all data and start fresh: `docker compose down -v`.

## 2. Configure environment variables

Each app that needs one has an `.env.example` — copy it and (for the backend) fill in any optional integrations you actually want to use:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/admin-portal/.env.example apps/admin-portal/.env
cp apps/merchant-portal/.env.example apps/merchant-portal/.env
cp apps/ai-services/.env.example apps/ai-services/.env
```

The backend's defaults already match `docker-compose.yml` — you don't need to change `DATABASE_URL`, `REDIS_*`, or `RABBITMQ_URL` for local development.

## 3. Install dependencies

```bash
npm install
```

This installs the backend, both portals, and the shared UI package in one shot (they're npm workspaces). Flutter and Python have their own dependency managers — see their sections below.

## 4. Set up the database

```bash
cd apps/backend
npx prisma generate
npx prisma migrate dev
npx prisma db seed   # optional — creates an admin account and starter data
cd ../..
```

## 5. Run the apps

Each in its own terminal:

```bash
# Backend API — http://localhost:3000, Swagger at /api/docs
npm run backend

# Admin Portal — http://localhost:5173
npm run admin

# Merchant Portal — http://localhost:5174
npm run merchant
```

```bash
# AI Services — http://localhost:8000
cd apps/ai-services
python -m venv .venv && .venv\Scripts\activate   # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements-dev.txt
uvicorn src.main:app --reload
```

```bash
# Mobile app — launches on a connected device/emulator
cd apps/mobile
flutter pub get
dart run build_runner build --delete-conflicting-outputs   # generates freezed/json_serializable code
flutter run
```

## Everyday checks before pushing

```bash
npm run lint          # backend + both portals
npm run typecheck      # backend + both portals
npm run test            # backend + both portals

cd apps/mobile && flutter analyze && flutter test

cd apps/ai-services && pytest
```

These are exactly what CI runs on every pull request (see `.github/workflows/`) — running them locally first means a red build in GitHub is never a surprise.

## Continuous Integration

Three workflows, each scoped to only run when the relevant app changes:

| Workflow | Covers | Triggers on changes to |
|---|---|---|
| `ci-node.yml` | Backend + Admin Portal + Merchant Portal | `apps/backend`, `apps/admin-portal`, `apps/merchant-portal`, `packages/shared-ui` |
| `ci-mobile.yml` | Flutter app | `apps/mobile` |
| `ci-ai-services.yml` | AI Services | `apps/ai-services` |

All three run on every pull request and push to `main`, and are free (GitHub Actions is unlimited for public repos).

## Deploying

This repo is set up for local development, not production deployment. A few things worth knowing before handing this off to whoever deploys it:

- **No DB dump needed for a first launch** — run `npx prisma migrate deploy` against a fresh production MySQL database, then `npx prisma db seed`.
- **Redis and RabbitMQ are required in production too**, not just locally — they need to be provisioned (managed services or self-hosted), not just "dumped" like a database.
- **Uploaded files** (`apps/backend/uploads/` — profile photos, KYC documents, campaign media) live on local disk per this project's storage convention, not S3. Whoever deploys this needs **persistent** storage for that folder, not ephemeral container disk.
- **The mobile app** builds and deploys separately from everything else — it needs signing and submission through Google Play / Apple App Store, not a web deploy.
- Every `.env.example` file in this repo documents exactly which environment variables production needs — copy the structure, fill in real production values (freshly generated JWT secrets, live Razorpay keys, etc.), never the dev placeholders.

## Project docs

- `apps/backend/README.md` — backend architecture, folder structure, Swagger location
- `CLAUDE.md` — the architectural conventions this codebase follows (feature modules, response format, logging, etc.)
