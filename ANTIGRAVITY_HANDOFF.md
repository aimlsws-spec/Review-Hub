# VIRAL KAR — Engineering Handoff Brief (continue from 2 Oct 2026)

You are continuing work on **VIRAL KAR**, a reward-driven engagement platform, in this monorepo:

| App | Path | Stack |
|---|---|---|
| Backend API | `apps/backend` | NestJS 10, Prisma 5 + **MySQL**, Redis, BullMQ, Winston |
| Mobile app (users) | `apps/mobile` | Flutter, **Riverpod 3** (manual providers, no codegen), GoRouter, Dio, Freezed |
| Merchant portal | `apps/merchant-portal` | React + Vite + TS, React Query, react-hook-form, Tailwind |
| Admin portal | `apps/admin-portal` | Same as merchant portal |
| Shared UI | `packages/shared-ui` | Shared React components and helpers used by both portals |
| AI service | `apps/ai-services` | Python FastAPI (optional; backend has local fallbacks) |

The previous engineer (an AI agent) stopped part-way through **Module 2, Task 8**. Everything below tells you exactly
what is done, what is half-done, how this codebase expects you to work, and what to build next, in order.

---

## 0. Read these first (do not skip)

1. `CLAUDE.md` (repo root): the permanent rulebook. Every rule is binding.
2. `docs/FEATURES.md`: what exists, where, and known gaps (trust it; it is kept honest).
3. `docs/DEPLOYMENT.md`: how production is deployed (cPanel, `scripts/deploy-backend.sh`).
4. `git status` and `git diff --stat`: **about 160 files of finished but uncommitted work** (Module 1 and Task 7).
   Do not revert, reformat, or "clean up" any of it. **Do not commit or push** unless the user asks you to in that turn.

---

## 1. Hard rules (from the project owner; non-negotiable)

### Product and scope
- **Never touch Razorpay / live payments.** No gateway work, no RazorpayX, no paid checkout through the gateway,
  no changes in `apps/backend/src/modules/payment`. Live credentials do not exist. Anything that needs real money
  movement must use the existing **merchant wallet** (funded by manual/admin-approved top-up) or be deferred.
- The platform rewards **honest** feedback, never positive reviews. Do not add anything that incentivises ratings.
- If a task needs a genuine **business/legal decision** that the code and this brief don't answer, **stop and ask
  the user**. Don't guess. Tasks that are already known to need this are marked **ASK FIRST** below.
- No scope creep: no unrelated refactors, no dependency upgrades you weren't asked for, small reviewable diffs.
- No dead code: every new service is registered in its module, every new screen is routed and reachable.

### Backend (from CLAUDE.md, enforced)
- MySQL only (never PostgreSQL syntax), UUID primary keys, soft delete where applicable, Prisma only.
- Feature-module layout; **business logic only in services**, DB access in repositories, controllers just validate
  and delegate. Never return raw Prisma objects with secrets; use DTOs / mapped shapes.
- Winston logging only, **never `console.log`** in `src/` (scripts under `prisma/` may print).
- Throw from the `AppException` hierarchy (`src/common/exceptions/domain.exceptions.ts`), never a bare `Error`
  in request paths.
- **Every schema change ships complete in one go:** edit `schema.prisma`, add a migration folder under
  `prisma/migrations/<timestamp>_<name>/migration.sql`, run `npx prisma generate`, update DTOs, services, Swagger,
  validation, seed data, and tests. Never leave a field unused or a migration missing.
  - Docker/MySQL was **not running** for the previous engineer, so the last two migrations were **hand-written**
    in Prisma's exact SQL style (see `20261002090000_*` and `20261002120000_*`). If MySQL is available, prefer
    `npx prisma migrate dev --name <name>` and check that it produces no drift for the existing ones.
  - MySQL index names have a 64-character limit.
- **Every backend service, repository and controller has a `.spec.ts` beside it** (Jest +
  `Test.createTestingModule` + hand-written mocks). Copy the style of the nearest existing spec.
- Validation errors from the global `ValidationPipe` return **HTTP 422**, not 400 (`common/pipes/validation.pipe.ts`).
  Service-level refusals (`BadRequestException`) return 400. Prisma unique violations (P2002) return 409.
  The previous engineer got this wrong once; double-check status codes in e2e tests.
- OTP errors carry a readable `message` and the machine reason in `code` (`AUTH_ERRORS.OTP_*`). Compare on
  `error.code`, never on the message.

### Mobile (the owner's mandatory Flutter rules)
- **No `setState` anywhere.** All UI state via Riverpod. Page-scoped providers are `.autoDispose`, declared at the top
  of the screen file. `StateProvider` comes from `package:flutter_riverpod/legacy.dart`.
  `ConsumerStatefulWidget` is allowed **only** to own `TextEditingController`/`GlobalKey<FormState>` lifecycles.
- In this Riverpod version there is no `AutoDisposeNotifier` or `FamilyNotifier` class: use plain
  `Notifier`/`AsyncNotifier` with `NotifierProvider.autoDispose(...)`.
- Async state = Riverpod `AsyncValue` + the app's own `Result<T>` (`core/errors/result.dart`). Don't invent `UiState`.
- `core/` must never import from `features/`. Features expose only public providers/models/screens.
- No raw `Color(0xFF...)`; use `AppColors.*`. No `print()`.
- Layering per feature: `data/` (models + repository) → `providers/` → `presentation/screens|widgets/`.
- Models use Freezed + json_serializable; regenerate with
  `dart run build_runner build --delete-conflicting-outputs`, and commit the generated files.
- New Dio endpoints go in `core/constants/api_endpoints.dart`. Pre-session auth endpoints must be added to
  `_authExemptPaths` in `core/network/auth_interceptor.dart` (otherwise a 401 there is treated as an expired session).
- Tests that navigate need a router: use `test/support/router_harness.dart` (`routerFor(screen)`). Widget tests
  that touch Hive must use an in-memory box (`Hive.openBox(name, bytes: Uint8List(0))`); real file I/O hangs
  inside the widget-test fake clock.

### Repository hygiene (learned the hard way; follow exactly)
- **Line endings:** most files are CRLF in the working tree (`core.autocrlf=true`). When you edit with a script,
  preserve the file's existing ending. Don't convert whole files.
- **`dart format`:** only ever format files **you created** (`dart format -l 120 <new files>`). Never format an
  existing folder; it rewrites unrelated and generated files and floods the diff. Hand-format lines you add to
  existing files.
- **Lockfiles:** `npm install` and `dart run` can rewrite `package-lock.json` / `apps/mobile/pubspec.lock` as a side
  effect. If you didn't intend a dependency change, restore them with `git checkout -- <lockfile>`.
  When you **do** add a dependency, never guess a version: use `npm install <pkg>` / `flutter pub add <pkg>`.
- Don't hand-edit `*.g.dart` / `*.freezed.dart`.

### Verification gate (run after every task; all must be clean before moving on)
```
# Backend (apps/backend)
npx tsc --noEmit -p tsconfig.json
npx eslint "{src,test}/**/*.ts"
npx jest                      # full run; if a suite times out only under parallel load, re-run that file alone
npx nest build

# Mobile (apps/mobile)
flutter analyze
flutter test

# Portals (apps/admin-portal, apps/merchant-portal)
npx tsc --noEmit
npx eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0
npx vitest run
npm run build
```
Known **pre-existing** lint findings you did not cause (leave them unless asked): backend 10 problems in
`config.module.ts` (import order), `ai-assist.service.ts`, `auth.controller.ts` (appleSignin warning),
`merchant-campaign.controller.ts`, `merchant-report-export.service(.spec).ts`, `user-kyc.service.spec.ts`,
`virus-scan.service.spec.ts`; merchant portal 1 error in `src/hooks/useCampaigns.ts`. Introduce **no new** ones.
Jest's filtered summary can hide "Test suite failed to run": always look at the `Test Suites:` line, not only `Tests:`.

E2E tests (`npm run test:e2e`) need `docker compose up -d mysql redis` + `npm run e2e:db:create`. They have **never
been run** for Module 1 / Task 7 work (no Docker at the time). If you can run them, do so early (see §3).

---

## 2. What is already DONE (uncommitted, verified by unit tests, typecheck, lint and build)

### Module 1 — Auth and account (all 6 tasks)
- Policy acceptance (FR-008): `PolicyAcceptance` model + `PolicyType` enum; versions in `POLICY_DOCUMENTS`
  (`auth/constants`); `GET /auth/policies`, `POST /auth/policies/accept`; `pendingPolicies` and `hasPassword` on
  `GET /auth/me`; public `GET /pages/:slug` (published CMS pages). Mobile `features/legal` + router gate; merchant
  portal `PolicyGate` + register checkbox.
- New-device sign-in check: `NewDeviceService` (install id via `X-Device-ID`; first device trusted), challenge in
  Redis bound to the device, `POST /auth/login/verify-device`, `/auth/login/resend-device-code`, alert email in
  `AuthListener`. Mobile screen + both portals (`packages/shared-ui/VerifyDeviceForm`, `getDeviceId`).
- Password minimum 10 everywhere (`PASSWORD_POLICY`, mobile `AppConstants`, shared-ui `passwordPolicy.ts`).
- Phone change (`PhoneChangeService`, OTP to the **new** number) and account deletion (blocked by wallet balance,
  pending rewards, open withdrawals, owning a merchant; frees email/phone; soft delete).
- One-time mobile permissions intro (`features/permissions`); the push prompt waits for it (`main.dart`).
- Fixed along the way: mobile social sign-in DTO 400; generic OTP endpoints now refuse `PHONE_CHANGE` /
  `NEW_DEVICE_LOGIN`; readable OTP messages; shared Modal close button no longer submits forms.

### Module 2, Task 7 — Bank account numbers and UPI IDs encrypted at rest
- `src/shared/crypto/`: `FieldCipher` (AES-256-GCM, `enc:v1:<keyId>:...`, previous-key support, HMAC blind index),
  `FieldEncryptionService` (config `fieldEncryption.*`; dev fallback keys with a warning; **production requires**
  `FIELD_ENCRYPTION_KEY` and `FIELD_HASH_KEY`, validated in `config.module.ts`), `BankDetailsProtector`
  (`seal`, `mask` → `XXXX1234`, `reveal`, `maskNested`, `revealNested`), global `CryptoModule`,
  test helper `shared/crypto/testing.ts` (import it directly; it is deliberately not in the barrel).
- Schema/migration `20261002120000_encrypt_bank_details`: `accountNumberHash`, `accountNumberLast4` on both bank
  tables; uniques/indexes moved to the hash.
- Repositories mask by default. Only `WithdrawalRepository.findByIdForPayout`,
  `MerchantRefundRepository.findByIdForPayout`, `WithdrawalSettlementRepository.findAwaitingManualPayout` (admin pays
  by hand) and `MerchantBankRepository.findByMerchantIdRevealed` (admin verification) reveal.
- Fraud linkage (`risk/repositories/account-linkage.repository.ts`) compares the hash.
- DTO validators `IsBankAccountNumber` (9–18 digits) and `IsUpiId` in `merchant/validators`.
- Backfill: `npm run db:encrypt-bank-details` (`prisma/scripts/encrypt-bank-details.ts`, idempotent), wired into
  `scripts/deploy-backend.sh` right after `prisma migrate deploy`. `.env.example` documents the keys.
- E2E written (not yet run): `test/bank-details-encryption.e2e-spec.ts`, plus an assertion added to
  `test/withdrawal-rules-and-manual-payout.e2e-spec.ts`.
- **Not done for Task 7:** a client-side digits/UPI pattern on the merchant portal `DocumentsPage` bank form and the
  mobile `add_bank_account_screen.dart` (server already validates with 422). Optional UX polish.

### Docs updated
`docs/FEATURES.md` (policy acceptance, new-device check, phone change/deletion, password/permissions) and
`docs/DEPLOYMENT.md` step 7 (publish the 3 CMS pages: `terms-and-conditions`, `privacy-policy`, `reward-policy`).
Add a FEATURES.md entry for bank-detail encryption and a DEPLOYMENT.md note about generating the two keys
(back them up with the database backups; losing the encryption key makes stored numbers unreadable).

---

## 3. First thing to do: run what has never run

If Docker is available:
1. `docker compose up -d mysql redis` (repo root), then in `apps/backend`: `npx prisma migrate deploy`,
   `npm run db:encrypt-bank-details`, `npm run e2e:db:create` (once), `npm run test:e2e`.
2. Fix anything the new suites `test/account-security.e2e-spec.ts` and `test/bank-details-encryption.e2e-spec.ts`
   reveal. They were written without ever executing.
If Docker is not available, say so in your report and carry on.

---

## 4. Where work PAUSED — Module 2, Task 8: Security review (Must)

Deliverable: fixes for everything you can fix safely, plus a written report at
`docs/security/REVIEW-2026-10.md` (finding, severity, evidence `file:line`, fix or recommendation, status).

### Finding 1 — rate limiting is not enforced anywhere (HIGH) — **fix in progress, nothing changed yet**
`ThrottlerModule` is configured in `app.module.ts`, but `ThrottlerGuard` is **never registered**, so every
`@Throttle(...)` (login, register, OTP send/verify/resend, forgot/reset password, new-device verify, phone change,
account delete) does nothing. Fix plan already worked out:
- Add a guard `src/common/guards/app-throttler.guard.ts` extending `ThrottlerGuard`, overriding `getTracker` to use
  the **authenticated user id** when `req.user` exists, else the IP. Reason: Indian mobile carriers use CGNAT, so
  per-IP limits on authenticated routes would throttle many unrelated users sharing one IP.
- Register it as an `APP_GUARD` **after** `JwtAuthGuard` (guards run in registration order, so `req.user` is set).
- E2E impact: the suites register many users per minute from 127.0.0.1, which would hit `register`'s
  10/min limit. Use the throttler module's `skipIf` to skip **only when `NODE_ENV === 'test'`** (the e2e harness sets
  that in `test/setup/safety.ts`). Production must never be able to switch it off.
- Unit-test the tracker choice and the skip rule; add one e2e only if you add a separate opt-in flag.
- Note in the report: the store is in-memory per process (fine for one cPanel instance; needs Redis storage if the
  backend ever runs more than one instance).

### Remaining Task 8 checklist (audit each, fix or report)
1. **Access to other users' records (IDOR).** Enumerate every route with an id parameter
   (`grep -rn "@Get(':\|@Patch(':\|@Delete(':\|@Post(':" src/modules`). For each, confirm the service checks
   ownership (pattern: `if (!x || x.userId !== userId) throw new NotFoundException(...)`). Pay special attention to
   **merchant routes `merchants/:merchantId/...`**: verify a guard or service check ties `merchantId` to the caller
   (owner or `MerchantTeam` member with the right role). Write an e2e "user A cannot read/modify user B's X" test
   for any gap you fix.
2. **Admin endpoints.** Every controller under `modules/admin` and every `admin/*` path must have `RolesGuard` +
   `@Roles(...)`. Check the `AdminRole` enum (SUPER_ADMIN, PLATFORM_ADMIN, FINANCE_TEAM, SUPPORT_TEAM, FRAUD_TEAM,
   CONTENT_MODERATOR, CAMPAIGN_REVIEWER) is actually used to narrow money actions (withdrawal approval, refunds,
   manual top-up, reward clawback) to finance roles. Report mismatches; fix obvious ones.
3. **Uploads.** `src/storage/storage.service.ts` + `virus-scan.service.ts`: verify magic-byte type checks (not just
   the client mimetype), size limits, generated filenames (no user-controlled paths), and that the static mounts in
   `app.module.ts` expose only `profile`, `campaign`, `cms`, `stories`. **KYC and submission proofs must never be
   public**; check the authenticated file-download endpoints for path traversal and ownership.
4. **SSRF in merchant webhooks** (`modules/webhooks`). Merchants register arbitrary URLs and the server POSTs to
   them. Block private/loopback/link-local/metadata ranges (resolve DNS, check every resolved address, re-check on
   redirect or disable redirects), require `https` in production, and set a timeout. Reuse
   `risk/utils/cidr.util.ts` if it fits.
5. **Raw SQL.** `grep -rn "\$queryRaw\|\$executeRaw\|Unsafe" src`. Any string interpolation into SQL is critical.
6. **Swagger in production:** `config/swagger.config.ts` / `main.ts`. Disable in production or put behind admin auth.
7. **Error leakage:** the Prisma P2002 handler (`database/prisma/prisma-exception.filter.ts`) puts constraint field
   names in the message (e.g. `userId_accountNumberHash_ifscCode`). Replace with a generic "already exists" message.
   Confirm stack traces never reach clients in production.
8. **PAN numbers are stored in plain text** (`UserKycDocument.documentNumber`). Encrypt them with the same
   `FieldCipher`, adding a blind-index column, because `account-linkage.repository.ts` (`usersSharingPan`) compares
   PANs by equality. Follow the Task 7 pattern exactly: migration, backfill script (or extend the existing one),
   masked by default, revealed only for the admin KYC reviewer. Admin KYC UI: `admin-portal/src/pages/UserKycPage.tsx`.
9. **Two-factor authentication is never checked at sign-in.** `isTwoFactorEnabled` can be switched on, but
   `AuthService.login` ignores it. **ASK FIRST**: either enforce it (reuse the new-device challenge flow, which
   already does "code before tokens") or hide the 2FA toggle. Recommend enforcing.
10. JWT: algorithm pinned (HS256), audience/issuer checked, access token 15 min, refresh rotation, refresh tokens
    stored hashed. Check that **reuse of a rotated refresh token revokes the session family**; if not, report it.
11. Secrets in logs: grep Winston calls in auth/payment/wallet for tokens, passwords, OTP codes, full account numbers.
12. CORS (already hardened, see `config.module.spec.ts`) and helmet: just confirm and record.

---

## 5. Module 3 — Task engine

### Task 9 — Per-user completion limits: one-time, daily, weekly, monthly (FR-016) — Must
- `CampaignTask` (schema ~line 1110) has no limit fields. Add `completionLimit` enum
  (`ONCE`, `DAILY`, `WEEKLY`, `MONTHLY`; default `ONCE`, which matches today's behaviour) and
  `maxCompletionsPerPeriod Int @default(1)`. Migration + seed + DTOs (merchant campaign task create/update) + Swagger.
- Enforce in `task/services/task-participation.service.ts` at submission time: count the user's non-rejected
  submissions for that task in the current period. Use **IST (Asia/Kolkata)** period boundaries, reusing
  `getIstDayBoundaries` / `getIstMonthBoundaries` from `@common/utils` (add a week helper; weeks start Monday).
  Must be race-safe: two simultaneous submissions must not both pass. Copy the row-lock approach from
  `database/prisma/row-lock.ts` or use a unique constraint on (taskId, userId, periodKey).
- Return a clear 400 with when the user can try again. Show the limit on the mobile task detail screen
  ("Once a day", "Available again tomorrow") and in the merchant portal campaign task form.
- Tests: unit (each period, boundary at IST midnight, rejected submissions don't count) + a concurrent e2e.

### Task 10 — "Report issue" on a task, linked to a support ticket — Should
- Reuse the support module (`modules/support`); don't build a parallel system. Add an optional `campaignTaskId`
  (and/or `submissionId`) relation on the support ticket, plus a category such as `TASK_ISSUE`.
- `POST /tasks/:taskId/report-issue` (reason enum + description) creates the ticket, owned by the caller.
- Mobile: a "Report an issue" action on `task_detail_screen.dart` → small form → opens the created ticket.
- Admin `SupportTicketsPage.tsx`: show and link the task/campaign on such tickets.

### Task 11 — Saved campaigns on the server — Could
- Today they are phone-only (Hive key `StorageKeys.savedCampaignIds`). Add `SavedCampaign` (userId, campaignId,
  unique pair, createdAt) with `GET/PUT/DELETE /users/me/saved-campaigns/:campaignId` and a list endpoint.
- Mobile: switch the saved-campaigns provider to the API with **optimistic toggle + rollback**; on first run after
  update, upload any locally saved ids once, then clear the Hive key.

---

## 6. Module 4 — Wallet and gamification

### Task 12 — Earnings split into bonus, referral and cashback — Should
- **No new balance columns.** Derive from `WalletTransaction` rows with status `SUCCESS` grouped by type
  (`WalletTransactionType`: CREDIT, BONUS, REFERRAL, ... ; see schema ~line 279). Check how task rewards are recorded
  (probably CREDIT with a reward reference) so "task earnings" vs "bonus" vs "referral" are split correctly.
  "Cashback" has no type today: report that rather than inventing one, unless a source clearly exists.
- Endpoint e.g. `GET /wallet/earnings-breakdown?from&to` (lifetime by default). Subtract clawbacks/reversals from
  the right bucket. Show on mobile `wallet_screen.dart`.

### Task 13 — Weekly and monthly earnings charts (mobile) — Should
- Endpoint returning daily totals for the last 7 days and weekly/monthly totals, in IST buckets.
- Add a chart package with `flutter pub add fl_chart` (no chart library exists yet). Charts on the wallet screen
  with a week/month toggle (page-scoped provider). Empty and error states. Widget tests.

### Task 14 — Named tiers Bronze → Platinum over the numeric level — Should
- Level comes from XP (`gamification/repositories/gamification-profile.repository.ts`, `levelForXp`). Add a pure
  `tierForLevel(level)` mapping with thresholds in one constants file (Bronze, Silver, Gold, Diamond, Platinum, as
  the spec names them). Expose `tier` and `nextTier`/progress in the gamification profile response.
  **ASK FIRST** about the level thresholds if they aren't obvious from the spec; propose defaults.
- Mobile: tier badge on the gamification screen and home header.

### Task 15 — Spec achievements as badges — Should
- `BadgeCriteriaType` today: XP_THRESHOLD, STREAK_THRESHOLD, LEVEL_THRESHOLD, REWARD_COUNT. The spec asks for
  100 tasks, 1,000 tasks, 100 reviews, 50 referrals, 30-day streak, Top Earner. Add the missing criteria types
  (e.g. `TASK_COUNT`, `REVIEW_TASK_COUNT`, `REFERRAL_COUNT`) and evaluate them where badges are awarded today
  (`gamification.service.ts`). Seed the badges (idempotent upsert in `prisma/seed.ts`).
- "Top Earner" needs a rule (e.g. top 10 earners of the month): **ASK FIRST**, or leave it out and say so.
- Admin `BadgesPage.tsx` must offer the new criteria types.

### Task 16 — Lucky draw and monthly contest — Could — **ASK FIRST, DO NOT BUILD WITHOUT WRITTEN RULES**
Prize draws tied to activity can fall under Indian state lottery/gaming laws. Write a short proposal
(`docs/proposals/lucky-draw.md`: options, open questions, legal check needed) and stop until the user provides the
rules and confirms a legal check.

---

## 7. Module 5 — Merchant and admin

### Task 17 — Merchant verification levels L1–L4 — Should
- Spec: L1 mobile verified, L2 email verified, L3 business verified (KYC approved), L4 premium. Derive L1–L3 from
  existing data (user phone/email verification, `MerchantVerificationStatus`, approved documents) with one pure
  function. L4 depends on Task 18's plan. Expose `verificationLevel` on the merchant profile, show it in both
  portals, and gate features if the spec implies it (**ASK FIRST** before blocking anything that works today).

### Task 18 — Subscription plans, premium tier, paid featured campaigns — Should
- **No payment gateway.** Charge from the **merchant wallet** through the existing ledger
  (`merchant-wallet.repository.ts`, row locks), never through Razorpay.
- Models: `SubscriptionPlan` (admin-managed: name, monthly price, limits/benefits as typed fields, active flag) and
  `MerchantSubscription` (merchant, plan, period start/end, status, auto-renew). Renewal = a BullMQ repeatable job
  that debits the wallet idempotently (copy `auto-recharge-scheduler.service.ts` + its processor). Featured
  campaign = a paid flag with a period, debited from the wallet, used in public campaign sorting.
- GST: plan charges probably need an invoice through the settlement/GST engine (`modules/settlement`). Check how
  commission invoices are produced and reuse it.
- **ASK FIRST** for prices, plan names and benefits. Build the admin plan management and the mechanics with
  placeholder plans seeded as **inactive**.

### Task 19 — Admin dashboard charts — Should
- `admin-portal/src/pages/DashboardPage.tsx` has no charts. Add a backend endpoint returning daily series for a
  range (default 30 days): revenue (commission), new users, campaigns created/active, withdrawals requested/paid,
  fraud flags. Use aggregate queries (group by DATE in IST), not row loops.
- Add `recharts` with `npm install recharts --workspace=apps/admin-portal`. Charts with loading/empty/error states,
  a range picker, and vitest tests (mock ResponsiveContainer sizes in jsdom).

### Task 20 — Admin referral tree view and account merge — Could
- Referral tree: read-only, lazily expanded levels from `User.referredById` (cap depth and page size).
- Account merge is destructive and touches money and audit trails: **ASK FIRST**, then write a design doc before any
  code.

### Task 21 — Track notification opens and clicks — Could
- `Notification` has `deliveredAt`/`readAt` (status enum QUEUED/SENT/DELIVERED/READ/FAILED). Add `openedAt` and
  `clickedAt` (and per-broadcast aggregates if broadcasts exist). Mobile reports open/click (push tap in
  `core/notifications/push_notification_controller.dart`, in-app list tap) through a small idempotent endpoint.
  Show open/click rates per broadcast in `NotificationCenterPage.tsx`. Email open pixels are out of scope unless asked.

---

## 8. Module 6 — AI operations

### Task 22 — Log every AI call, plus an admin AI monitoring page — Should
- Every outbound AI call (backend `modules/ai/services/*`, campaign builder, chatbot in `modules/support`, the
  `ai-services` worker callbacks) records an `AiCallLog`: feature, provider, model, model version, prompt version,
  input/output tokens, latency ms, estimated cost, confidence (when there is one), outcome (ok / fallback / error),
  and who triggered it. **Never store raw prompts or personal data**; store sizes and ids only.
- Centralise it: one wrapper/service the call sites use, rather than logging inline in every caller. Cost comes from
  per-model prices kept with the admin AI provider settings (`ai-provider-admin.service.ts`, `AiProvidersPage.tsx`).
- Admin page: volume, error/fallback rate, p95 latency, tokens and cost per day and per feature.
- Retention: add a cleanup job (e.g. 90 days), following the existing scheduled-jobs pattern.

### Task 23 — Campaign optimizer every 24 hours, with suggestions to merchants — Should
- `campaign/services/merchant-insights.service.ts` already computes suggestions on demand. Add a daily BullMQ
  repeatable job (copy `settlement-scheduler.service.ts`) that runs it for each merchant with active campaigns,
  stores new suggestions (dedupe: don't resend an identical one within N days), and notifies the merchant through the
  notification module. Make it visible on `admin ScheduledJobsPage`. Use `CampaignPerformanceService` for numbers:
  **the `CampaignAnalytics` table is never written and is always empty.**

### Task 24 — Daily AI summary report for admins — Could
- A daily job builds a short summary (yesterday: signups, tasks, rewards, withdrawals, fraud flags, top campaigns),
  using the AI service when it's up and a deterministic template when it isn't, then emails it to SUPER_ADMIN /
  PLATFORM_ADMIN and shows it on the admin dashboard. Reuse Task 19's aggregates.

---

## 9. Order of work

1. §3 (run the e2e tests if Docker is available).
2. Task 8 (finish Finding 1, then the checklist, then the report).
3. Tasks 9 → 10 → 11.
4. Tasks 12 → 13 → 14 → 15 (16: proposal only).
5. Tasks 19 → 17 → 18 (ask for pricing before building charges) → 21 → 20 (tree only; merge needs approval).
6. Tasks 22 → 23 → 24.

Run the full verification gate after **each** task, not each module. Batch the ASK FIRST questions into one message
to the user when you reach the first of them, and continue with the non-blocked tasks while you wait.

## 10. After each task, report (CLAUDE.md requires this format)

- Summary
- Files modified
- Architecture impact
- Possible risks
- Suggested improvements
- Next recommended task

Also say plainly what you could **not** verify (for example e2e tests without Docker), and anything the user must do
(keys to generate, CMS pages to publish, decisions to make). Update `docs/FEATURES.md` "Known gaps" as you close gaps.
