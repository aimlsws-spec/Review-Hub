# VIRAL KAR — Engineering Handoff Brief (continue from 3 Oct 2026, afternoon)

You are an AI coding agent continuing work on **VIRAL KAR**, a reward-driven engagement platform, in this monorepo.
The previous agent stopped in the middle of **Task 21** of the plan below. This brief tells you exactly what is done,
what is half-done, the rules you must follow, how the previous agent worked (copy it), and what to build next, in
order, with enough detail that you should not need to re-plan anything.

This brief **supersedes** `ANTIGRAVITY_HANDOFF.md` (2 Oct). That older file is still worth reading for background on
Module 1 and Tasks 7–11, but where the two disagree, this one wins.

| App | Path | Stack |
|---|---|---|
| Backend API | `apps/backend` | NestJS 10, Prisma 5 + **MySQL**, Redis, BullMQ, Winston |
| Mobile app (users) | `apps/mobile` | Flutter, **Riverpod 3** (manual providers, no codegen), GoRouter, Dio, Freezed |
| Merchant portal | `apps/merchant-portal` | React + Vite + TS, React Query, Tailwind |
| Admin portal | `apps/admin-portal` | Same as merchant portal |
| Shared UI | `packages/shared-ui` | React components used by both portals |
| AI service | `apps/ai-services` | Python FastAPI (optional; backend has local fallbacks) |

---

## 0. Read these first (do not skip)

1. `CLAUDE.md` (repo root): the permanent rulebook. Every rule is binding.
2. This file, all of it.
3. `docs/FEATURES.md`, `docs/DEPLOYMENT.md`, `docs/security/REVIEW-2026-10.md`.
4. Run `git status` and `git diff --stat`. **About 95 files of finished, uncommitted work** (Tasks 12–19 and most of 21)
   are in the working tree. Do not revert, reformat or "clean up" any of it. **Do not commit or push** unless the user
   asks you to in that turn. The last commit is `9c751f6` (security review); everything after it is uncommitted.

---

## 1. Decisions already made by the owner (do not ask again)

Given on 3 Oct 2026. Build to these exactly.

| Topic | Decision |
|---|---|
| 2FA | Enforce at sign-in (done in Task 8). |
| Finance role | Money actions = `FINANCE_TEAM` or `SUPER_ADMIN` only (done in Task 8). |
| Merchant team roles | Standard table: money/bank/team/webhooks/profile = Owner+Admin; campaigns/reviews/support also Manager; read = all active members (done). |
| Tiers (Task 14) | Bronze 1–4, Silver 5–9, Gold 10–19, Diamond 20–29, Platinum 30+ (done). |
| Top Earner (Task 15) | Top 10 task earners per IST month, fraud-flagged excluded, monthly job (done). |
| Lucky draw (Task 16) | Proposal doc only, no code (done: `docs/proposals/lucky-draw.md`). |
| Merchant L1–L4 (Task 17) | Badge only, block nothing (done). |
| Plans (Task 18) | Basic ₹0 / Growth ₹999 / Premium ₹2,999, featured ₹199 per 7 days, all seeded **inactive**, +18% GST, wallet only (done). |
| Account merge (Task 20) | Read-only referral tree + a **design doc** for merge. **No merge code.** |
| Payments | **Never touch Razorpay / the payment module.** Anything that moves money uses the merchant wallet ledger. |
| Honest feedback | Never add anything that rewards positive ratings. |

If a task needs a genuine business or legal decision not covered above, **stop and ask the user**. Do not guess.

---

## 2. Where work stopped: finish Task 21 first

**Task 21 — Track notification opens and clicks.** Backend and admin portal are done and tested. The mobile part was
written but **never analysed or tested**: the user stopped the session during that step.

Done (backend, verified: typecheck clean, 241 notification tests pass, lint clean):
- `Notification.openedAt` / `clickedAt` + migration `20261003160000_notification_engagement`.
- `POST /notifications/:notificationId/engagement` body `{ action: 'OPENED' | 'CLICKED' }`
  (`NotificationEngagementDto`), ownership-checked, idempotent (`NotificationRepository.recordEngagement` only fills empty
  timestamps; CLICKED also sets openedAt).
- Push messages now carry `notificationId` in their `data` (`NotificationService.dispatch`).
- `NotificationBroadcastRepository.engagement()` → `{ trackedMessages, opened, clicked, openRate, clickRate }` (push +
  in-app only; email not tracked); returned by `BroadcastService.getById` as `engagement`.
- Admin `BroadcastDetailModal.tsx` shows an "Engagement" section (tests pass, 15).

Written but **unverified** (mobile):
- `core/constants/api_endpoints.dart`: `notificationEngagement(id)`.
- `features/notifications/data/notification_repository.dart`: `recordEngagement()` + `enum NotificationEngagement`
  (at the bottom of the file).
- `features/notifications/presentation/screens/notifications_screen.dart`: tile tap reports `opened` via `unawaited`.
  `import 'dart:async';` was added. **It probably still needs**
  `import '../../data/notification_repository.dart';` for `NotificationEngagement` (check with analyze).
- `core/notifications/push_notification_controller.dart`: new port `pushTapReportProvider` (no-op default), `_reportTap`
  called on push tap and on cold-start initial message. `import 'dart:async';` added.
- `main.dart`: overrides `pushTapReportProvider` to call `recordEngagement(id, NotificationEngagement.clicked)`; imports
  `features/notifications/data/notification_repository.dart`.

Your first steps:
1. `cd apps/mobile && flutter analyze` → fix whatever it reports in those four files only (hand-edit; see §4 on formatting).
2. Add a test `test/features/notifications/notification_engagement_test.dart` (new file, so you may `dart format` it):
   tapping a tile calls `recordEngagement(id, opened)` (fake `NotificationRepository` via
   `notificationRepositoryProvider.overrideWithValue`), and `NotificationEngagement.clicked.apiValue == 'CLICKED'`.
3. `flutter test`. Then run the whole verification gate (§5) for backend, admin portal and mobile.

---

## 3. What is DONE in this session (uncommitted, verified unless noted)

Security review (Task 8) was finished and committed in `9c751f6`. Since then:

### Task 12 — Earnings split (bonus / referral / task)
- Pure module `apps/backend/src/modules/wallet/earnings.ts` (+ spec): `summariseEarnings`, `earningsSeries`,
  `chartKeys`, `EARNING_TRANSACTION_TYPES`. Tasks = CREDIT with referenceType `Reward` minus CLAWBACK; bonus = BONUS;
  referral = REFERRAL. **No cashback exists anywhere** in the platform: there is deliberately no cashback figure.
- `UserWalletRepository.findEarningRows()`; `WalletService.getEarningsBreakdown()` / `getEarningsChart()`.
- `GET /wallet/earnings?from&to` (IST days, lifetime by default) and `GET /wallet/earnings/chart?period=week|month`
  (last 7 IST days / last 6 IST months). DTOs `EarningsQueryDto`, `EarningsChartQueryDto`.
- `common/utils/date.util.ts`: new `istDayKey()`, `istMonthKey()` (reuse them).

### Task 13 — Earnings charts (mobile)
- `fl_chart ^1.2.0` added with `flutter pub add`.
- `features/wallet/data/models/earnings_model.dart` (Freezed, safe number parsing), repository methods,
  `earningsBreakdownProvider`, `earningsChartProvider` (family by `EarningsPeriod`).
- `features/wallet/presentation/widgets/earnings_card.dart` (page-scoped `earningsPeriodProvider`, week/month toggle,
  loading/empty/error states), shown on `wallet_screen.dart`. Test `test/features/wallet/earnings_card_test.dart`.

### Task 14 — Tiers
- `apps/backend/src/modules/gamification/tiers.ts` (+ spec): `TIERS`, `tierForLevel`, `tierProgress`, `xpForLevel`.
  `GamificationService.getProfile` returns `tier`, `nextTier`, `nextTierLevel`, `xpToNextTier`, `progressPercent`.
- Mobile: `GamificationTier` enum on the profile model, `presentation/widgets/tier_badge.dart`, tier + progress bar on
  the gamification screen, home screen "Tier" tile (replaced an invented client-side level-name function). Test
  `test/features/gamification/tier_test.dart`.

### Task 15 — Achievement badges
- `BadgeCriteriaType` + `REVIEW_TASK_COUNT`, `REFERRAL_COUNT`, `TOP_EARNER_MONTHLY`; migration
  `20261003140000_badge_achievements` (also inserts the 6 spec badges: TASKS_100, TASKS_1000 (REWARD_COUNT),
  REVIEWS_100, REFERRALS_50, STREAK_30 (STREAK_THRESHOLD), TOP_EARNER); same badges seeded in `prisma/seed.ts`.
- `GamificationService`: lazy counts per criterion, `checkBadges(userId)` (called on `referral.rewarded` by
  `GamificationListener`), `awardTopEarners(now)` (previous IST month, skips fraud-flagged and existing holders).
- Repos: `RewardRepository.countCreditedForTaskTypes`, `topEarnersBetween`; `BadgeRepository.countPaidReferrals`,
  `findActiveByCriteria`, `holdersAmong`, `withOpenFraudFlags`. Constant `REVIEW_TASK_TYPES`.
- Admin `BadgesPage.tsx` offers the new criteria ("Reward count" label renamed "Tasks completed").

### Platform jobs framework (built in Task 15, reused by 18 and by 22–24)
- **Use this for every new scheduled job. Do not create new queues.**
- `apps/backend/src/jobs/platform-jobs.constants.ts`: `PLATFORM_JOBS` (jobName, jobType, cronExpression), timezone
  `Asia/Kolkata`. Already declared: `top-earner-badges`, `ai-call-log-cleanup`, `campaign-optimizer`,
  `subscription-renewals`, `featured-campaign-expiry`, `daily-admin-summary`.
- `jobs/platform-jobs.scheduler.ts`: registers every entry as a BullMQ repeatable job on queue `platform-jobs`.
- `jobs/processors/platform-jobs.processor.ts`: `handlers` map job name → function, each run through
  `JobRunRecorder`. **Currently typed `Partial<Record<PlatformJobName, Handler>>`** because `ai-call-log-cleanup`,
  `campaign-optimizer` and `daily-admin-summary` have no handler yet. When Tasks 22–24 add them, **change it to a full
  `Record<PlatformJobName, Handler>`** so the compiler enforces completeness, and add each to the processor spec.
- `modules/scheduled-jobs/services/job-run-recorder.service.ts` (`JobRunRecorder`, exported by `ScheduledJobsModule`):
  creates the `ScheduledJob` row on first run, **skips the job if an admin switched it off** on the Scheduled Jobs
  page, writes a `JobExecutionLog` (duration, result JSON, or error) and re-throws errors so BullMQ retries.
- `JobsModule` imports `GamificationModule`, `ScheduledJobsModule`, `SubscriptionModule`; add new modules there.

### Task 19 — Admin dashboard charts
- `modules/admin/repositories/dashboard-metrics.repository.ts`: grouped MySQL queries per IST day (tagged-template
  `$queryRaw`, `DATE(DATE_ADD(col, INTERVAL 330 MINUTE))`): commission, new users, campaigns created, withdrawals
  requested, withdrawals paid, fraud flags; plus `countActiveCampaigns()`.
- `AdminDashboardService.getSeries(days)` / `seriesBetween(start, end)` (**exported from `AdminModule`; Task 24 must
  reuse it**). `GET /admin/dashboard/series?days=7..90`.
- Admin portal: `recharts` installed (`npm install recharts --workspace=apps/admin-portal`),
  `components/DashboardCharts.tsx` (+ test, ResponsiveContainer mocked to a fixed size in jsdom), on `DashboardPage`.

### Task 18 — Subscriptions and featured campaigns (wallet only, GST invoices)
- Schema + migration `20261003150000_merchant_subscriptions`: `SubscriptionPlan`, `MerchantSubscription`
  (`ACTIVE | PAST_DUE | EXPIRED`), `MerchantServiceCharge` (unique `[subscriptionId, periodStart]`),
  `Invoice.settlementId` now optional + `Invoice.serviceChargeId`, `PlatformConfiguration.featuredCampaignPrice/Days`.
  The migration inserts the 3 example plans **inactive**.
- New feature module `apps/backend/src/modules/subscription/` (controllers, dto, repositories, services, `billing.ts`):
  - `MerchantSubscriptionRepository.charge(input, apply)`: one transaction under the merchant-wallet row lock: balance
    check (`INSUFFICIENT_BALANCE`), debit, `MerchantServiceCharge`, `WalletTransaction` (DEBIT,
    referenceType `MerchantServiceCharge`), then `apply(tx, chargeId)`. Total 0 = no charge, just apply.
  - `MerchantSubscriptionService`: `getOverview`, `subscribe`, `cancel`, `resume`, `featureCampaign` (free while the
    plan has featured slots), `renewDue` (job `subscription-renewals`, 3-day grace then EXPIRED, notifies the owner),
    `expireFeaturedCampaigns` (job `featured-campaign-expiry`).
  - `InvoiceService.generateForServiceCharge()` in the settlement module; PDF gets an optional `description` line.
  - Admin: `admin/subscription-plans` (read = Admin, write = `FINANCE_ROLES`). Merchant:
    `merchants/:merchantId/subscription` (+ `/cancel`, `/resume`), `merchants/:merchantId/campaigns/:id/feature`
    (team role Owner/Admin).
- `maxActiveCampaigns` is stored and shown but **not enforced** (needs an owner decision about non-subscribers).
- Portals: admin `SubscriptionPlansPage` (+ sidebar, route, test), featured price/days on
  `PlatformConfigurationPage`; merchant `SubscriptionPage` ("Plan" in sidebar, route `/plan`, test), "Feature" button +
  confirm on `CampaignsPage` (test).

### Task 17 — Merchant verification levels
- `modules/merchant/verification-level.ts` (+ spec), `MerchantRepository.findVerificationFacts()`;
  `verificationLevel` (0–4) on `GET /merchants/me`, `/merchants/:id` and admin merchant detail.
- `packages/shared-ui/src/VerificationLevelBadge.tsx` (exported), shown on merchant `ProfilePage` and admin
  `MerchantsPage` detail.

### Task 16 — `docs/proposals/lucky-draw.md` (done, no code).

### Not yet done for any of the above
- `docs/FEATURES.md`, `docs/DEPLOYMENT.md` have **not** been updated for Tasks 12–21. Do it at the end (see §7).
- None of the new migrations (`20261003120000` … `20261003160000`) has run against MySQL. They were hand-written in
  Prisma's style. Docker was not running.

---

## 4. How to work (copy the previous agent exactly)

### Before writing code (from CLAUDE.md)
Analyse the existing code, search for a similar implementation, reuse it, keep backward compatibility. Read a file
before changing it. Ask when a business decision is genuinely missing.

### Backend rules
- MySQL only, UUID keys, soft delete where applicable, Prisma only. Feature-module layout: logic in services, DB access
  in repositories, controllers only validate and delegate. DTOs with class-validator; global `ValidationPipe` returns
  **422** for validation errors, `BadRequestException` returns 400, P2002 returns 409.
- Throw from `src/common/exceptions/domain.exceptions.ts`. Note: `ConflictException(resource, field)` builds an
  "already exists" message: for any other refusal use `BadRequestException(message, code)`.
- Winston via Nest `Logger`, never `console.log` in `src/`. Never log tokens, OTPs, passwords, full account/PAN numbers.
- **Every schema change ships complete**: `schema.prisma` + a migration folder
  `prisma/migrations/<timestamp>_<name>/migration.sql` (MySQL, Prisma's exact style, index names ≤ 64 chars) +
  `npx prisma validate` + `npx prisma generate` + DTOs + Swagger + seed + tests.
  - **Never run `npx prisma format`.** It re-aligns unrelated models and floods the diff. If it ever runs:
    `git checkout -- prisma/schema.prisma` and re-apply only your lines.
  - If you add rows production needs (roles, badges, plans), insert them in the migration with
    `INSERT ... SELECT ... WHERE NOT EXISTS` **and** in `prisma/seed.ts` (production is not necessarily seeded).
- **Every service, repository and controller has a `.spec.ts` beside it.** Jest, `Test.createTestingModule` or direct
  construction with hand-written mocks; copy the nearest existing spec. Watch for mock leaks: `jest.clearAllMocks()`
  does not reset `mockResolvedValue`, so use `mockResolvedValueOnce` in one-off tests.
- Reuse what exists: `FINANCE_ROLES` / `@Roles(...)` (auth), `MERCHANT_TEAM_PERMISSIONS` + `@TeamRoles(...)` +
  `MerchantTeamRoleGuard` on merchant write routes, `MerchantOwnershipGuard`, `CampaignOwnershipGuard`,
  `IdentityNumberProtector` / `BankDetailsProtector` (shared/crypto), `istDayKey` / `getIstDayBoundaries` /
  `getIstMonthBoundaries` / `parseIstDay` (`@common/utils`), `NotificationQueueService.enqueue` for notifications,
  `AuditLogService.record` for admin actions, the platform jobs framework for schedules, `AdminDashboardService` for
  platform figures.
- Raw SQL only as tagged templates (`$queryRaw\`...${value}\``), never `$queryRawUnsafe`.

### Mobile rules (the owner's mandatory rules, also in memory)
- **No `setState`.** Riverpod only; page-scoped providers are `.autoDispose`, declared at the top of the screen/widget
  file. `StateProvider` comes from `package:flutter_riverpod/legacy.dart`. No `AutoDisposeNotifier`/`FamilyNotifier`
  classes exist in this Riverpod version.
- Async state = `AsyncValue` + the app's `Result<T>` (`core/errors/result.dart`). Do not invent `UiState`.
- `core/` must never import `features/`. When core needs a feature, add a **port provider** in core with a no-op
  default and override it in `main.dart` (see `pushTokenSyncProvider`, `pushTapReportProvider`).
- No raw `Color(0xFF...)` (use `AppColors.*`), no `print()`, no magic strings for statuses (enums), safe `fromJson`
  (`@Default`, `unknownEnumValue`, tolerant number parsing).
- Models: Freezed + json_serializable; regenerate with `dart run build_runner build --delete-conflicting-outputs`
  and commit generated files. New Dio endpoints go in `core/constants/api_endpoints.dart`.
- Add packages only with `flutter pub add <pkg>` (never guess versions).
- **Formatting:** `dart format -l 120` **only on files you created**. Never format an existing folder. In existing
  files, hand-format the lines you write.
- `flutter analyze` must be clean and `flutter test` must pass before a task counts as done.

### Portal rules
- Feature-based React, React Query hooks in `src/hooks`, API calls in `src/api`, types in `src/types/index.ts`, query
  keys in `src/constants`. Lazy routes in `src/routes/index.tsx`, sidebar in `src/layouts/Sidebar.tsx`.
- Shared components go in `packages/shared-ui` (exported from its `index.ts`) instead of duplicating them per portal.
- Tests: vitest + Testing Library; mock hooks with `vi.mock`. jsdom has no layout: mock recharts'
  `ResponsiveContainer` to a fixed size.
- ESLint `import/order` is enforced (alphabetised groups). `npx eslint --fix <your files only>` fixes order safely;
  then check `git diff` that nothing else in the file changed.

### Editing mechanics that worked on this Windows machine
- Most files are CRLF in the working tree (some LF). **Preserve each file's existing line ending.** The previous agent
  made multi-line edits with small Python scripts written to a scratch file:
  read with `open(p, encoding='utf-8', newline='')`, detect `nl = '\r\n' if '\r\n' in s else '\n'`, replace exact
  anchors with `assert s.count(old) == 1`, write back with `newline=''`.
- Do **not** put such scripts inline in a bash heredoc: apostrophes in the code (e.g. "invitation's") break the shell.
  Write the script to a file first, then run it.
- Lockfiles: `npm install` / `flutter pub` may rewrite `package-lock.json` / `pubspec.lock`. Keep only intended
  dependency changes; otherwise `git checkout -- <lockfile>`.
- The machine is memory-constrained: **run the backend Jest suite and a portal's vitest one at a time**. Running both
  in parallel crashed Node with out-of-memory.

### Known pre-existing lint findings (do not fix unless asked; introduce no new ones)
- Backend: 10 problems (6 errors, 4 warnings) in `config.module.ts`, `ai-assist.service.ts`, `auth.controller.ts`
  (appleSignin warning), `merchant-campaign.controller.ts`, `merchant-report-export.service(.spec).ts`,
  `user-kyc.service.spec.ts`, `virus-scan.service.spec.ts`.
- Merchant portal: 1 error in `src/hooks/useCampaigns.ts` (import order).
- Admin portal: clean.

---

## 5. Verification gate (run after every task; all must pass before moving on)

```
# Backend (apps/backend)
npx tsc --noEmit -p tsconfig.json
npx eslint "{src,test}/**/*.ts"          # expect exactly the 10 pre-existing problems
npx jest                                 # full run; read the "Test Suites:" line, not only "Tests:"
npx nest build

# Mobile (apps/mobile)
flutter analyze
flutter test

# Portals (apps/admin-portal, apps/merchant-portal) — run one portal at a time
npx tsc --noEmit
npx eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0
npx vitest run
npm run build
```

Last full results before this brief: backend 267 suites / 2,807 tests (before Tasks 12–21 added more), admin portal
395 tests, merchant portal 186, mobile 323. All later per-task runs were green (backend subsets, admin 52 files,
merchant subsets, mobile wallet/gamification). A **full** gate has not been run since Task 12 began: run it once Task
21 is finished.

E2E tests (`npm run test:e2e`) need `docker compose up -d mysql redis` + `npm run e2e:db:create`. Run them if Docker is
available, and report if it is not.

---

## 6. Remaining tasks, in this order

### Task 21 — finish (see §2)

### Task 20 — Admin referral tree + account-merge design doc — Could
- **Referral tree (read-only).** Data: `Referral` (`referrerId`, `referredUserId` unique, `rewardIssued`,
  `completedAt`, `deletedAt`) and/or `User.referredById` (check which is populated; prefer `Referral`).
  Backend in the admin module: `GET /admin/users/:userId/referrals?page&limit` returning one level of direct referrals
  (id, name, joinedAt, rewardIssued, their own referral count) so the UI can expand lazily; cap page size at 50 and
  depth is naturally lazy. Also return the user's referrer (one level up). Role: `SystemRole.Admin`. Repository +
  service + controller + DTO + specs.
- Admin portal: a "Referrals" panel in the `UsersPage` detail modal (like `AccountRiskPanel`), with expandable rows
  that fetch the next level on click. Component + hook + test.
- **Account merge: design doc only**, `docs/proposals/account-merge.md`: what merging means, which tables move
  (wallet balances and ledger, rewards, submissions, referrals, KYC, devices, sessions, audit), conflicts (two
  wallets, two PANs, unique email/phone), money and tax implications (TDS history, withdrawals in flight), fraud risks,
  audit trail, reversibility, and open questions for the owner. **No merge code.**

### Task 22 — Log every AI call + admin AI monitoring page — Should
- New model `AiCallLog`: id, feature (string/enum), provider, model, modelVersion?, promptVersion?, inputTokens?,
  outputTokens?, latencyMs, estimatedCost (Decimal)?, confidence (Decimal)?, outcome (`OK | FALLBACK | ERROR`),
  triggeredByUserId?, createdAt; indexes on (createdAt), (feature, createdAt). Migration (hand-written if no MySQL).
  **Never store prompts, responses or personal data** — sizes and ids only.
- Centralise: one `AiCallLogger` service (e.g. in `modules/ai`) with `record()` and a `track(feature, meta, fn)`
  wrapper. First list every outbound AI call: `grep -rn "fetch\|axios\|httpService\|openai\|chat/completions" apps/backend/src/modules/ai`,
  the campaign builder (`campaign-builder.service`), the support chatbot, `kyc-ocr.service`, story generation in
  `ai-assist.service`, and the ai-services worker callbacks (`ai-verification.service`). Route each through the
  wrapper; keep existing fallbacks and record them as `FALLBACK`.
- Cost: per-model prices from the admin AI provider settings (`ai-provider-admin.service.ts`, `AiProvidersPage.tsx`).
  If no price field exists, add optional input/output price per 1K tokens to the provider config (schema + DTO +
  page). Missing price ⇒ `estimatedCost` null.
- Admin endpoint `GET /admin/ai/monitoring?days=7..90`: per day and per feature: volume, error rate, fallback rate,
  p95 latency, tokens, cost. Aggregate in SQL where practical (p95 may be computed in code over a bounded set).
  Admin page (recharts, like `DashboardCharts`) + sidebar + route + tests.
- Retention: handler for the already-declared platform job `ai-call-log-cleanup` deleting logs older than 90 days
  (constant), wired into `PlatformJobsProcessor.handlers`.

### Task 23 — Daily campaign optimizer with merchant suggestions — Should
- `campaign/services/merchant-insights.service.ts` already computes suggestions on demand. Use
  **`CampaignPerformanceService`** for numbers: **the `CampaignAnalytics` table is never written and is always empty.**
- Handler for platform job `campaign-optimizer` (06:00 IST): for each merchant with ACTIVE campaigns, compute
  suggestions, store new ones (new model e.g. `MerchantSuggestion`: merchantId, campaignId?, kind/code, message,
  createdAt, dismissedAt?) with dedupe (do not store/send an identical suggestion for the same campaign within 7 days),
  and notify the merchant owner via `NotificationQueueService` (IN_APP + EMAIL) only when something new was found.
- Merchant portal: show stored suggestions (e.g. on the dashboard/insights area) with dismiss. Specs for all of it.
  The job automatically appears on the admin Scheduled Jobs page via `JobRunRecorder`.

### Task 24 — Daily AI summary report for admins — Could
- Handler for platform job `daily-admin-summary` (08:00 IST): yesterday's figures from
  `AdminDashboardService.seriesBetween(yesterdayStart, todayStart)` (signups, campaigns, commission, withdrawals,
  fraud flags) plus counts of tasks completed and rewards credited, and the top 5 campaigns by completions
  (`CampaignPerformanceService`).
- Text: use the AI service when available, through the Task 22 wrapper; otherwise a deterministic template (must be
  fully useful without AI). Never send personal data to the AI provider: aggregates only.
- Store the summary (model `AdminDailySummary`: date unique, text, figures JSON) and email it to users with role
  `SUPER_ADMIN` or `PLATFORM_ADMIN`/`ADMIN` (check what exists: roles are `super-admin`, `admin`, `finance-team`
  slugs). Show the latest summary on the admin `DashboardPage`.
- After this task, change `PlatformJobsProcessor.handlers` to a full `Record<PlatformJobName, Handler>` (see §3).

---

## 7. After the last task

1. Run the full verification gate (§5) for every app, one at a time.
2. Update `docs/FEATURES.md` for Tasks 12–24 (what, where, details, known limits: no cashback, plan campaign limits
   not enforced, featured expiry hourly, email opens not tracked, account merge not built), the "Known gaps" list, and
   `docs/DEPLOYMENT.md` (new migrations; plans seeded inactive; the platform jobs and their IST times; GST invoices
   for service charges).
3. Report to the user in the CLAUDE.md format: **Summary, Files modified, Architecture impact, Possible risks,
   Suggested improvements, Next recommended task**. Say plainly what you could not verify (e2e without Docker,
   hand-written migrations never run on MySQL) and what the user must do (run migrations, switch plans on, assign the
   finance role, review the proposals). Do not commit unless asked; suggest a commit message.

Report after **each** task too, briefly, so the user can follow along.
