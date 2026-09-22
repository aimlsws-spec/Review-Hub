# VIRAL KAR: Project Status Report

**As of:** 21 September 2026
**Scope:** the whole repository (`apps/backend`, `apps/admin-portal`, `apps/merchant-portal`, `apps/mobile`, `apps/ai-services`)

This replaces the audit of 10 July 2026, which rated the backend "A, production-ready" and described two modules. That audit is kept in `docs/archive/REPORT-2026-07-10-stale.md` for history and should not be relied on: since then the code has grown a lot, and testing against a real database has found several serious bugs (see section 5).

**The honest summary:** the platform is feature-rich and now has real end-to-end tests, but it is **not launch-ready**. Payments have never run against a real gateway, the mobile app is incomplete, and security review, load testing and production deployment have not been done.

---

## 1. What exists

| Area | Size |
|---|---|
| Backend | NestJS 10, 22 feature modules, 60 controllers, 89 database models, 60 enums, 14 migrations |
| Admin portal | React, 23 pages |
| Merchant portal | React, 15 pages |
| Mobile app | Flutter, 34 screens |
| AI service | FastAPI, with optional local Ollama; deterministic fallbacks when the model is off |

**Backend modules:** admin, ai, analytics, auth, campaign, dashboard, gamification, location, marketplace, merchant, notification, payment, referral, reports, risk, scheduled-jobs, settlement, support, task, user-kyc, wallet, webhooks.

**Stack decisions (from CLAUDE.md, permanent):** MySQL only, UUID keys, soft delete, local file storage under `uploads/` (no S3), Prisma as the only ORM, BullMQ on Redis for background jobs, Winston logging.

## 2. Verification (21 Sep 2026)

| Check | Result |
|---|---|
| Backend typecheck, lint (src and test), build | Clean, 0 warnings |
| Backend unit tests | 194 suites, 1,673 tests pass |
| Backend end-to-end tests | 6 suites, 76 tests pass (three full runs in a row) |
| Admin portal | 290 tests pass, lint clean at `--max-warnings 0`, builds |
| Merchant portal | 140 tests pass, lint clean at `--max-warnings 0`, builds |
| Mobile | `flutter analyze` clean, 45 tests pass |
| AI service | 70 tests pass |

### How to run the tests

- **Unit tests:** `npm test --workspace=apps/backend`. They mock the database.
- **End-to-end tests:** they start the whole app against real MySQL and Redis.
  1. `docker compose up -d mysql redis`
  2. `npm run e2e:db:create --workspace=apps/backend` (once)
  3. `npm run test:e2e --workspace=apps/backend`
- **The e2e tests can not touch real data.** They use the database `viral_kar_test`, Redis database 15, the mock payment gateway, captured (never sent) email, and blank credentials for SMS, push and payments. If any of those is wrong the run refuses to start. See `apps/backend/test/setup/safety.ts`.

## 3. What the end-to-end tests cover

- Merchant onboarding, campaign creation, admin moderation, and funding a campaign from the wallet
- A user completing a task, an admin approving it, the reward reaching the wallet, and the campaign budget being charged
- Withdrawals: minimum amount, PAN verification, balance check, bank-account ownership, hold on request, refund on rejection, payout on approval
- **Concurrency:** three simultaneous withdrawals against one balance, and three simultaneous approvals of one submission
- Profile details (date of birth, gender, state, city) and the public locations endpoints
- Health, authentication, and the test-safety guards themselves

## 4. Rules the code enforces, and how

| Rule | Where |
|---|---|
| A merchant can not approve their own campaign. Every submitted campaign goes to an admin. | `CampaignService.submitForApproval`. The `autoApprove` flag is stored but ignored. |
| Two requests can not spend one balance | Row locks (`SELECT ... FOR UPDATE`) in every wallet-changing method (`database/prisma/row-lock.ts`). Lock order: payment record, campaign, wallet. |
| A reward is paid exactly once, even if the job is retried | `RewardProcessor` and the ledger: each step checks the ledger before applying, so a retry resumes rather than skipping or repeating |
| A payment can not be credited twice by a webhook and a verify call together | `MerchantWalletRepository.confirmTopUp` locks the ledger entry first |
| Duplicate or suspicious proof is held for review | `risk` module: perceptual image hash, OCR text, IP reputation, account linkage |
| Personal details are not written to logs | Profile changes record that a detail changed, never its value |

## 5. Serious bugs found by real-database testing (all fixed)

1. **The backend could not start.** A background worker needed a repository its module never exported. Unit tests mock every dependency, so nothing noticed.
2. **Withdrawal double-spend.** Three simultaneous withdrawals of ₹2,000 from a ₹3,000 wallet all succeeded. Fixed with row locks.
3. **Rewards could be lost.** A worker that failed half-way through paying a reward left a record that a retry treated as "already done", so the user was never paid and the merchant never charged. Fixed by making every step repeatable.
4. **Merchant self-approval** of campaigns through a merchant-set flag.
5. **Two requests creating the same wallet** made one of them return a 500.

The lesson: mocked unit tests do not find these. Any new code that moves money needs an end-to-end test that runs it concurrently.

## 6. Known gaps and risks

**Money**
- **Razorpay has never run for real.** No credentials exist yet. Wallet recharge and payouts work only on the mock gateway. Production refuses the mock, so nothing money-related works in production until live keys are added.
- The reward worker still performs its steps as separate database operations. They are now safely repeatable, but they are not one atomic transaction.
- The admin-configurable minimum and maximum withdrawal are not connected to anything. The enforced minimum is a fixed ₹1,000, no maximum is enforced, and there is no daily limit or 24-hour cooling period (the original spec asks for both).
- Other money paths (refunds, marketplace redemptions, referral bonuses) have unit tests and row locks but no concurrent end-to-end tests yet.

**Product**
- No dispute workflow, no merchant auto-recharge, no forced app-update check.
- `CampaignAnalytics` is never written (it is always empty). Use `CampaignPerformanceService` for campaign results.
- The list of cities is a starter set (217 cities). A full list is needed before launch, and there is no admin screen for it.
- Mobile app: no Google or Apple sign-in, biometric lock, location or QR tasks, localization, or leaderboard screen.

**Operations**
- The deploy script and `.cpanel.yml` were tested by dry run only, never on a real cPanel server. The host may not offer Redis. See `docs/DEPLOYMENT.md`.
- Duplicate-image detection is tested in code and SQL but not with real uploaded photos.
- No security review, load test, monitoring or backup test has been done.

## 7. What changed most recently

- Campaign builder, support chatbot, merchant insights and smart notification timing (AI growth features)
- Admin KYC review and the notification center
- Duplicate-image and multi-account fraud signals
- Date of birth, gender and location on profiles, with public location lists
- The safe end-to-end test suite and the fixes it drove
- Portal lint cleanup, and the deploy script

## 8. Next

1. Phase 1: review-first product work (an honest-feedback guard on campaign wording, help content for the chatbot, the review flow on mobile)
2. Wire the withdrawal limits; add the daily limit and cooling period
3. Merchant analytics and finance
4. Mobile completion
5. Hardening, deployment and launch, then the Razorpay switch when credentials arrive
