# VIRAL KAR — Feature Reference

This is a functional catalogue of the platform: for every feature, what it does, why it
exists, and exactly where to find it in the code. For *system* architecture (how the
pieces fit together, the request/queue/AI flow), see `docs/architecture/README.md` — this
document is the complement to it, organized by feature instead of by layer.

Written against the codebase as it actually is on 22 September 2026. Where a feature is
partial or has a known limitation, that's called out under **Status** rather than left
implicit — this file is meant to be trusted, not aspirational.

---

## How the platform fits together

Four apps in one monorepo:

| App | Path | Stack |
|---|---|---|
| Backend API | `apps/backend` | NestJS, Prisma/MySQL, Redis, BullMQ |
| Mobile app (end users) | `apps/mobile` | Flutter, Riverpod, GoRouter, Dio |
| Merchant Portal | `apps/merchant-portal` | React, Vite, React Query |
| Admin Portal | `apps/admin-portal` | React, Vite, React Query |
| AI Services | `apps/ai-services` | Python, FastAPI (optional — the backend has local-template fallbacks for everything it calls here) |

Three user types drive everything below: **users** (the mobile app, complete tasks, earn
rewards), **merchants** (the merchant portal, fund and run campaigns), **admins** (the
admin portal, moderate and operate the platform).

---

## 1. Identity & Authentication

### Account creation & login
**What**: Register/log in with email or phone + password, or via Google/Apple.
**Why**: The obvious front door — but also the anchor for everything else (wallet,
KYC, device trust) hangs off the `User` record created here.
**Where**: `apps/backend/src/modules/auth` — `auth.controller.ts`, `auth.service.ts`.
Mobile: `apps/mobile/lib/features/auth`.
**Details**:
- Passwords are bcrypt-hashed; refresh tokens are stored **hashed**, not plain, so a
  leaked database doesn't hand out usable sessions.
- Access + refresh JWT pair, refresh rotated on use, session tracked per device.
- Account lockout after repeated failed logins (`failedLoginAttempts`/`lockedUntil` on
  `User`).
- OTP verification for phone/email (`send-otp`/`verify-otp`/`resend-otp`), backed by
  Redis with expiry + attempt limits.
- Optional 2FA (`enable`/`disable`/`verify-two-factor`).

### Google / Apple sign-in — web
**What**: Browser-redirect OAuth for the two portals (`GET /auth/google`, `/auth/apple`
→ provider consent screen → `/callback`).
**Where**: `google.strategy.ts`, `apple.strategy.ts`, same controller.
**Status**: Working, used by the portals only — a browser redirect doesn't fit a native
mobile app, which is why the endpoints below exist separately.

### Google / Apple sign-in — mobile
**What**: `POST /auth/google/mobile` and `/auth/apple/mobile` take a native SDK's ID
token directly and verify it server-side, instead of a redirect.
**Why**: Added 22 Sep 2026 so the mobile app can offer one-tap sign-in instead of only
phone OTP.
**Where**: Same controller, `googleMobileAuth`/`appleMobileAuth`. Mobile:
`login_screen.dart`'s `_SocialSignInNotifier`, using the `google_sign_in` and
`sign_in_with_apple` packages.
**Details — read this before relying on it**: both endpoints verify the token's
**audience** (`GOOGLE_CLIENT_ID`/`APPLE_CLIENT_ID` in `apps/backend/.env`) — without a
real value there, verification will correctly *fail* rather than silently accept a
token from an unrelated app. **Status: code-complete, not yet live** — it needs a real
Google OAuth client ID (registered against the app's package name + release SHA
fingerprint) and an Apple Service ID/key, which don't exist yet. Ships with empty
placeholders, same pattern as Razorpay below.

### Device tracking & integrity signals
**What**: Every login/registration reports the device's install ID, whether it looks
rooted, whether it's an emulator, and (added 22 Sep 2026) whether an automation
framework (Frida/Xposed/LSPosed) is detected.
**Why**: These are fraud *signals*, not verdicts — a risky device gets its withdrawals
held for review, it's never auto-blocked. Anyone controlling their own phone can hide
these markers, so the system treats a "no" as "couldn't tell," never as proof of safety.
**Where**: Backend: `auth/services/device.service.ts`, consumed by
`modules/risk/services/account-risk.service.ts`. Mobile native side:
`android/app/.../DeviceIntegrity.kt`; Dart side: `features/auth/data/device_integrity.dart`.
**Details**: Root/automation-framework packages must be declared in the Android
manifest's `<queries>` block to even be visible to the check on Android 11+ — both
lists are there (`AndroidManifest.xml`).

### Biometric app lock
**What**: Optional fingerprint/face lock on top of an already-signed-in session —
confirms it's really the owner before showing the app, after 30 seconds away or on
launch.
**Why**: A phone can be picked up by someone else without the account itself being
compromised; this is a second, local gate.
**Where**: Mobile only — `apps/mobile/lib/features/app_lock`.

---

## 2. User Wallet & Rewards

### Wallet balance & transactions
**What**: Every user has a wallet with `availableBalance`, `pendingBalance`, and
`lockedBalance` (funds tied up in an in-flight withdrawal). Every change is a
`WalletTransaction` row — nothing mutates the balance without leaving a record.
**Where**: `apps/backend/src/modules/wallet`. Mobile: `features/wallet`.
**Details — concurrency**: every wallet-changing operation takes a row lock
(`SELECT ... FOR UPDATE`, see `database/prisma/row-lock.ts`) in a fixed order (payment
record → campaign → wallet) specifically because three simultaneous withdrawals against
one balance was a real bug found during e2e testing — see `REPORT.md` §5.

### Withdrawals
**What**: A user requests a payout to their bank account or UPI. Goes through PAN
verification, balance check, bank-account ownership check, then admin approval (or
auto-approval below a threshold), then payout.
**Where**: `wallet/services/withdrawal-policy.service.ts` (the actual limits/cooling
period), `wallet/controllers/withdrawal.controller.ts`.
**Details**: Minimum amount, maximum amount, a daily cap, and a 24-hour cooling period
between withdrawals are all enforced here and are admin-configurable (see Platform
Configuration below) — this was a known gap in earlier builds ("the admin-configurable
minimum and maximum are not connected to anything") that's since been wired up.
A withdrawal from a device that scores high-risk (see Fraud & Risk) is **held for
review** rather than rejected or auto-paid.

### TDS (tax deducted at source)
**What**: Once a user's payouts in a financial year cross a configured threshold, tax
is withheld from that payout and every one after it, at a configured rate.
**Why**: A real Indian tax-compliance requirement for platforms paying out to
individuals under Section 194-O style rules — this is arithmetic the platform's tax
adviser configures, not a business decision made in code.
**Where**: `wallet/tds.ts` (the pure calculation — deliberately "just arithmetic, done
the same way every time and to the paisa"), `wallet/services/tds-report.service.ts`
(the admin-facing report and CSV export), model `TdsDeduction`.
**Details**: This applies to **user payouts**, not merchants — a merchant's tax
documents are the GST invoices/notes described under Merchant Finance below. These are
two unrelated things that share the word "tax."

### Reward crediting
**What**: When a task submission is approved, the reward is credited to the user's
wallet and the campaign's budget is charged, atomically.
**Why the "atomically" matters**: a worker that died half-way through paying a reward
once left a record that a retry treated as "already done" — the user was never paid and
the merchant never charged. Every step now checks the ledger before applying, so a
retried job resumes instead of skipping or double-paying (`RewardProcessor`,
`apps/backend/src/jobs/processors`).
**Status**: The steps are safely *repeatable*, but still not one single atomic database
transaction — a documented, accepted trade-off, not an oversight.

---

## 3. Campaigns

### Campaign lifecycle
**What**: A merchant drafts a campaign (title, budget, reward per task, targeting),
submits it, an admin approves or requests changes, it goes active, and can be
paused/resumed/cancelled.
**Why**: The core of the whole platform — everything else (tasks, rewards, disputes)
hangs off an active campaign.
**Where**: `apps/backend/src/modules/campaign`. Merchant portal: `pages/CampaignsPage.tsx`.
Admin: `pages/CampaignQueuePage.tsx`.
**Details — a rule enforced in code, not policy**: a merchant cannot approve their own
campaign. `autoApprove` is a stored field but is **ignored** by
`CampaignService.submitForApproval` — every submitted campaign goes to a human admin,
regardless of what the merchant's account settings say.

### Targeting
**What**: A campaign can restrict who sees it by age range, gender, minimum follower
count, minimum gamification level, and location (country/state/city).
**Where**: `CampaignTarget` model, matched in `campaign.repository.ts`'s
`findAvailableForUser`.

### AI Campaign Builder
**What**: A merchant describes a goal in plain terms; the assistant proposes a budget,
reward amount, audience, and estimated reach.
**Where**: `campaign/services/campaign-builder.service.ts`.
**Status**: Falls back to a deterministic local template if the AI service is down —
never blocks campaign creation.

### Honest-feedback wording policy
**What**: Checks a campaign's title/description against a policy engine before it can
go live, specifically to catch wording that would incentivize *positive* reviews
(against Google/platform policy) rather than *honest* ones.
**Why**: A real compliance requirement, not a nice-to-have — this is the platform's
actual defense against the reviews-for-pay problem that would get merchants' Google
profiles suspended.
**Where**: `campaign/services/campaign-policy.service.ts`, `campaign/policy/`. Mobile
surfaces this as the `HonestFeedbackNotice` widget on the review-task submission screen.

### Campaign performance / analytics
**What**: Views, joins, completions, budget spent, conversion rate — computed live from
`CampaignParticipant`/`TaskSubmission`/`Reward` records.
**Where**: `campaign/services/campaign-performance.service.ts`.
**Status — important**: the `CampaignAnalytics` table exists in the schema but is
**never written to, on purpose** (see the doc comment on the model in `schema.prisma`).
`CampaignPerformanceService` computes everything live instead. If you're looking for
campaign numbers, that service is where they actually come from — the table with
"Analytics" in the name is a red herring.

### Merchant insights
**What**: Cost-per-completion and optimization suggestions across a merchant's
campaigns.
**Where**: `campaign/services/merchant-insights.service.ts`,
`merchant-analytics.service.ts`.

---

## 4. Tasks & Submissions

### Task types
**What**: A campaign is made of one or more tasks a user completes. Platform-specific
types (Instagram follow/like/comment/story, Facebook share/like, Google/Play Store
review, app install, website visit, watch video, YouTube subscribe, Twitter follow,
survey), plus generic types (screenshot/URL/video/text/file-upload), plus two added
22 Sep 2026: **QR_SCAN** and **LOCATION_CHECKIN**.
**Where**: `TaskType` enum in `schema.prisma`; `apps/backend/src/modules/task`.

### QR-scan & location check-in tasks
**What**: A merchant sets a secret code (printed as a QR code at their physical
store) or a target lat/long + radius. The user scans/checks in; the backend verifies
deterministically — no AI, no human reviewer, decision is instant.
**Why**: Named in the platform spec as "store visit" tasks; there was previously no
way to represent an in-person task at all.
**Where**: Backend: `task/services/qr-scan-verification.service.ts`,
`location-checkin-verification.service.ts`; configuration validated in
`campaign-task.service.ts`. Mobile: `features/tasks/presentation/screens/qr_scanner_screen.dart`
(camera via `mobile_scanner`), the location check-in card in `task_submission_screen.dart`
(uses the location service under §12).
**Details — a real security property, verify it if you touch this code**: the expected
QR code is **redacted** from every response the app ever receives
(`CampaignTaskService.redactForParticipant`) — the merchant's secret code never leaves
the server. The location target, by contrast, is sent in full, because the user
legitimately needs to know where to go.

### Submission & verification pipeline
**What**: A user submits evidence (screenshot, link, text, or the deterministic
QR/location proof above). It lands `PENDING`, gets queued for AI verification
(`AIVerificationJob`), and is auto-approved, auto-rejected, or escalated to
`PENDING_MANUAL` for a human reviewer depending on AI confidence.
**Where**: `task/services/task-participation.service.ts` (submission intake),
`submission.service.ts` (the decide/approve/reject state machine), the AI worker in
`apps/ai-services` that claims queued jobs.
**Details**: QR/location submissions skip this entire queue — see above, they're
decided the instant they're created.

### Disputes
**What**: A user whose submission was rejected can file a dispute with a reason. An
admin reviews it and either upholds the rejection or reverses it (which runs the
submission through the *normal* approval path — reward credited, budget charged, same
as any other approval).
**Why**: Added 22 Sep 2026 — previously a rejected user's only recourse was a generic
support ticket with no link back to the actual submission record.
**Where**: Backend: `task/services/dispute.service.ts`,
`admin/controllers/admin-dispute.controller.ts`. Admin portal: `pages/DisputesPage.tsx`.
Mobile: the "Dispute this rejection" action on a rejected submission.
**Details**: One dispute per submission (enforced by a unique constraint), only
allowed on a `REJECTED` submission. Resolution fires a notification to the user either
way ("upheld" or "resolved in your favour").

### Review Assistant (honest feedback)
**What**: For review-type tasks, the app asks guided questions (what did you like, what
could improve) and drafts 3–5 editable review options — the user copies, edits, and
posts it themselves. The assistant never fabricates an experience or posts on the
user's behalf.
**Where**: Backend: `ai/services/ai-assist.service.ts`'s `draftReviews`. Mobile:
`features/tasks/presentation/screens/review_assistant_screen.dart`.

---

## 5. Fraud & Risk Detection

All of this is **signal, not verdict** — every check below feeds a risk score that
holds something for human review; nothing here auto-bans on its own.

### Duplicate-image detection
**What**: Perceptual hashing (not exact-match) catches a screenshot reused across
submissions, even if resized or re-compressed.
**Where**: `risk/utils/perceptual-hash.util.ts`, `risk/services/duplicate-image.service.ts`.

### IP reputation
**What**: Flags an IP as VPN/proxy/Tor/datacenter, from public reputation lists,
refreshed on a timer.
**Where**: `risk/services/ip-reputation.service.ts`. Config: `IP_REPUTATION_LISTS` in
`.env` — empty by default, so every address reports `UNKNOWN` until you configure a
list (you'll see this exact warning in the boot log).

### Account linkage
**What**: Detects the same person operating multiple accounts (shared device, shared
bank account, referral abuse patterns).
**Where**: `risk/services/account-linkage.service.ts`.

### Submission risk assessment
**What**: Combines device signals, IP reputation, and submission patterns into a
per-submission risk flag, run on every submission (including QR/location ones).
**Where**: `risk/services/submission-risk.service.ts`, called from
`task-participation.service.ts`. Failures here **never block** the submission — a
down risk check costs you one signal, not a broken user flow.

### Account risk / high-risk devices
**What**: Admin-facing aggregate view of risky accounts and devices, and the panel
that holds a high-risk device's withdrawal for review.
**Where**: `risk/services/account-risk.service.ts`. Admin portal: `pages/FraudFlagsPage.tsx`
(both the "Submission Flags" and "High-Risk Devices" tabs live here).

### Reward clawback
**What**: When fraud is confirmed *after* a reward was already paid, an admin can
reverse it — clawed back from the wallet (capped at available balance; any shortfall is
recorded, not chased), with the merchant's campaign budget restored in full.
**Where**: `FraudFlagsPage.tsx`'s "Reverse reward" action, backend in the fraud-flag
resolution service.

---

## 6. Referral Program

**What**: Every user has a referral code; sharing it and having a friend register with
it earns a bonus once that friend completes their **first** rewarded task.
**Where**: `apps/backend/src/modules/referral`, event-driven via `ReferralListener`.
Mobile: `features/referral`, deep-linked via `viralkar://referral?code=...` (added
22 Sep 2026 — see §12).
**Status — one gap vs. the original product spec**: the spec describes a 3-tier
(10%/5%/2%) referral structure. What's actually implemented is a **single-level**
direct bonus (you → your direct referral, not their referrals too). Don't assume the
tiered structure exists without checking `referral.service.ts` again if this matters
to a decision you're making.
**Also**: invite links (`referral/controllers/invite.controller.ts`) are a separate,
simpler mechanism from the referral-code bonus flow above — a shareable link that
pre-fills the code at registration, not a distinct reward path.

---

## 7. Gamification

### Levels & badges
**What**: Users level up and earn badges based on criteria (tasks completed, streaks,
referral counts, etc.), each with admin-defined criteria types.
**Where**: `gamification/services/gamification.service.ts` (a user's own progress),
`badge-admin.service.ts` (admin defines badges). Admin portal: `pages/BadgesPage.tsx`.
Mobile: `features/gamification`.

### Daily reward (spin wheel / scratch card)
**What**: A once-a-day claimable bonus — the mechanic is described in the API as
"daily bonus / spin wheel / scratch card," admin-configurable prize pool.
**Where**: `gamification/services/daily-reward.service.ts` (claim logic),
`daily-reward-prize-admin.service.ts` (admin manages the prize pool). Admin portal:
`pages/DailyRewardPrizesPage.tsx`. Endpoint: `POST /gamification/daily-reward/claim`.

### Leaderboard
**What**: Ranks users, with an explicit opt-out (`User.hideFromLeaderboard`) — a user
who opts out is excluded from the ranking entirely, not just hidden from their own view.
**Where**: `apps/backend/src/modules/leaderboard`. Mobile: `features/leaderboard`.

---

## 8. Marketplace

**What**: Users redeem wallet balance for catalog items (gift cards, vouchers — whatever
the admin-managed catalog contains).
**Why**: The wallet-to-shopping conversion promised in the product spec.
**Where**: `apps/backend/src/modules/marketplace` (`marketplace.service.ts` for
browsing/redeeming, `marketplace-item-admin.service.ts` for the admin catalog). Admin
portal: `pages/MarketplacePage.tsx`. Mobile: `features/marketplace`.
**Status**: The catalog and redemption flow are real and working — but redemption
fulfillment is **admin-managed inventory**, not a live integration with an actual
gift-card vendor API (Amazon/Flipkart/etc.). That integration doesn't exist; it's
blocked on picking a vendor, a business decision, not an engineering task.

---

## 9. Notifications

### Channels & delivery
**What**: Push, email, SMS, WhatsApp (via Twilio), and in-app — every dispatch goes
through a BullMQ queue for retry semantics rather than firing inline.
**Where**: `apps/backend/src/modules/notification`, `notification/listeners/notification.listener.ts`
(turns domain events like "reward credited" or "dispute resolved" into queued
notifications), `notification/services/notification-queue.service.ts`.
**Status**: SMS/WhatsApp need Twilio credentials configured (`TWILIO_*` in `.env`) to
actually send — without them, the service logs a warning and no-ops rather than
failing. Push needs Firebase credentials, same pattern.

### Broadcasts
**What**: An admin sends a notification to a filtered audience (by location, activity,
etc.), either immediately or scheduled.
**Where**: `notification/services/broadcast.service.ts`, `broadcast-fan-out.service.ts`,
`broadcast-scheduler.service.ts` (a 60-second-interval check for due broadcasts). Admin
portal: `pages/NotificationCenterPage.tsx`.

### Smart send-time
**What**: Instead of blasting a notification at everyone at once, this predicts each
user's best send time from their own activity pattern.
**Where**: `notification/services/send-time.service.ts`.

### Templates
**What**: Reusable notification templates with variable substitution, managed by
admins.
**Where**: `notification/services/notification-template.service.ts`.

---

## 10. AI-Assisted Content

Every one of these calls out to `apps/ai-services` (optional) and falls back to a
local, deterministic template if that service is unreachable — **never** blocks a
user's flow on an AI outage.

| Feature | What | Where |
|---|---|---|
| Text suggestion | A short suggested caption for a task | `ai-assist.service.ts`'s `suggestText` |
| Review drafts | Guided, honest review options (see §4) | `draftReviews` |
| Captions | Short/long/professional/festival/emoji captions + hashtags for a campaign | `generateCaptions` |
| Story composition | Composes a campaign photo into a story-ready image, reusing the caption logic above | `composeStory`, endpoint `POST /ai/assist/story` |
| Chatbot | 24×7 support chatbot over a knowledge base (BM25 text search) with an LLM fallback | `support/services/chatbot.service.ts`, `knowledge-base.service.ts` |

**Status on Story**: the backend endpoint (added 22 Sep 2026) is real and tested, but
there is **no mobile screen calling it yet** — the one piece of the original AI-content
plan that's still just a backend capability with no UI.

---

## 11. Support

**What**: Ticket-based support (category, priority, threaded messages) plus the AI
chatbot above, on both the mobile app and merchant portal.
**Where**: `apps/backend/src/modules/support`. Admin: `pages/SupportTicketsPage.tsx`.
Merchant portal: `pages/SupportPage.tsx`. Mobile: `features/support`.

---

## 12. Location Services

**What**: A public (no-auth) endpoint listing every Indian state and, per state, its
cities — used by every location picker in every app (sign-up, campaign targeting,
merchant address).
**Where**: `apps/backend/src/modules/location`. Seed data:
`prisma/seed-data/india-locations.ts`.
**Status**: States are a complete list. Cities are a **starter set** (~217 cities) —
an admin screen to manage the list was added 22 Sep 2026
(`admin/controllers/city.controller.ts`, admin portal `pages/CitiesPage.tsx`), but the
underlying list itself still needs filling out before launch.

### Device location (mobile)
**What**: On-demand GPS position, never fetched automatically on app launch — only
when a screen actually needs it (nearest-sort, location check-in).
**Where**: `apps/mobile/lib/core/location/location_service.dart`. Added 22 Sep 2026.

### Nearest campaign sort
**What**: Sorts the campaign browse list by distance from the user's current position.
**Where**: `campaign/repositories/campaign.repository.ts`'s `findPublicNearest` —
computed in application code (haversine, `common/utils/geo.util.ts`) over a bounded
candidate batch, since Prisma can't do geo math in its query builder. A merchant with
no store coordinates set sorts last, never excluded.

### Deep links
**What**: A custom `viralkar://` URI scheme (chosen over Firebase Dynamic Links, which
is deprecated) — currently used to carry a referral code from a shared link straight
into the register screen.
**Where**: `apps/mobile/lib/core/deep_link/`.

---

## 13. Merchant Onboarding & KYC

**What**: A merchant registers a business, uploads KYC documents (PAN, GST
certificate, business registration, etc.), and an admin reviews and approves/rejects
each one.
**Where**: Backend: `apps/backend/src/modules/user-kyc` (confusingly named — it covers
merchant KYC, not just users), `admin/services/kyc-management.service.ts`. Admin
portal: `pages/UserKycPage.tsx`. Merchant portal: `pages/DocumentsPage.tsx`.
**Details**: Personal detail *changes* are logged as "a detail changed," never the
value itself — a deliberate privacy choice, not a missing feature.

---

## 14. Merchant Finance

### Merchant wallet
**What**: A merchant tops up their wallet (via Razorpay, or a manual admin-approved
top-up for bank transfers) to fund campaigns; the campaign engine reserves, spends, and
releases budget from it.
**Where**: `merchant/repositories/merchant-wallet.repository.ts`,
`merchant/services/manual-top-up.service.ts` (for the manual/bank-transfer path, with
its own approval + reversal flow). Merchant portal: `pages/WalletPage.tsx`.

### Settlements & GST invoices
**What**: A nightly job (`SettlementSchedulerService`) generates a settlement (what was
topped up, spent, and the platform's commission) for every merchant with wallet
activity in the period, then generates the corresponding GST invoice for that
commission.
**Where**: `apps/backend/src/modules/settlement`. Merchant-facing endpoints (added
22 Sep 2026 as the merchant portal **Finance page**):
`GET /merchants/:id/settlements`, `/invoices`, `/invoices/notes`, plus PDF downloads —
`merchant-portal/pages/FinancePage.tsx`.

### Credit & debit notes
**What**: An admin corrects a GST invoice by issuing a credit (reduces what was
charged) or debit (adds to it) note — never by editing the original invoice, which
would break the tax trail. A mistake is corrected with another note.
**Where**: `settlement/services/invoice-note.service.ts`. Admin portal:
`pages/FinancePage.tsx`'s "Invoices and notes" tab.

### Webhooks
**What**: A merchant registers their own endpoint to receive events (campaign
completed, submission approved, etc.), with delivery tracking and retries.
**Where**: `apps/backend/src/modules/webhooks`. Merchant portal: `pages/WebhooksPage.tsx`.

---

## 15. Payments

**What**: Razorpay for wallet top-ups (user side isn't a thing — this is merchant
wallet top-up and, eventually, user payouts via RazorpayX).
**Where**: `apps/backend/src/modules/payment`.
**Status — the single biggest platform-wide caveat**: **Razorpay has never run
against real money.** Only test-mode keys exist. In their absence, the platform runs
on a **mock gateway** (`PaymentModule is using the MOCK gateway` — you'll see this
exact warning in the boot log) that moves no real money and skips webhook signature
checks. The mock is automatically **refused** if `NODE_ENV=production`, so production
cannot silently run on fake payments — but nothing money-related works in production
until live Razorpay credentials are added. Do not build on top of payment code
assuming it's production-ready; it structurally cannot be until this changes.

---

## 16. Platform Administration

### Platform configuration
**What**: Admin-editable, no-redeploy-needed settings — commission rate, withdrawal
min/max/daily-limit, GST rate, KYC rules, OTP timeout, and (added 22 Sep 2026)
maintenance mode + minimum required app version.
**Where**: `apps/backend/src/modules/app-config` (maintenance/version gate — its own
module because it's checked by a **global guard** on every request, not a regular
service) and `admin/services/platform-configuration.service.ts` (everything else).
Admin portal: `pages/PlatformConfigurationPage.tsx`.
**Details**: The maintenance guard returns `503` to everyone except admins while
maintenance is on, and `426` when the caller's `X-App-Version` header is below the
configured minimum. Health checks, sign-in, and payment callbacks stay reachable during
maintenance on purpose — you don't want a maintenance window to also break the ability
to check whether maintenance is still needed.

### Feature flags
**What**: Simple on/off toggles for gating a feature without a deploy.
**Where**: `admin/services/feature-flag.service.ts`. Admin portal: `pages/FeatureFlagsPage.tsx`.

### Audit logs
**What**: Every admin decision (approve/reject/resolve/reverse, anywhere in the
platform) is recorded with before/after state, actor, and timestamp.
**Where**: `shared/audit/audit-log.service.ts`, called from nearly every admin service
in this document. Admin portal: `pages/AuditLogsPage.tsx`.

### User & merchant management
**What**: Search, suspend/reactivate, view wallet/device/login history for any user or
merchant.
**Where**: `admin/services/user-management.service.ts`. Admin portal: `pages/UsersPage.tsx`,
`pages/MerchantsPage.tsx`.

### CMS & FAQs
**What**: Admin-editable static pages (About, Privacy Policy, Terms) and FAQ entries,
served to the apps.
**Where**: `admin/services/cms-page.service.ts`, `faq.service.ts`. Admin portal:
`pages/cms/`.

### Scheduled jobs
**What**: Visibility into the platform's cron-style background jobs (settlement
generation, broadcast sending, etc.) and their run history.
**Where**: `apps/backend/src/modules/scheduled-jobs`. Admin portal: `pages/ScheduledJobsPage.tsx`.

### Analytics & reports
**What**: Platform-wide event tracking and daily aggregates; on-demand or scheduled
report generation.
**Where**: `apps/backend/src/modules/analytics`, `modules/reports`. Admin portal:
`pages/AnalyticsPage.tsx`.

### AI provider management
**What**: Admin-configurable AI provider settings (which model/provider the AI service
uses) — lets the platform stay model-agnostic rather than hard-coded to one vendor.
**Where**: `admin/services` (AI provider admin), admin portal `pages/AiProvidersPage.tsx`.

### Dashboard (BFF aggregation)
**What**: A single endpoint (`GET /dashboard/home`) that aggregates wallet balance,
featured campaigns, popular campaigns, and recommended tasks in one call — replacing
what used to be four separate round-trips from the mobile home screen.
**Where**: `apps/backend/src/modules/dashboard`.

---

## Cross-cutting things worth knowing regardless of which feature you're touching

- **Soft delete everywhere applicable** — most models have `deletedAt`; reads filter it,
  nothing hard-deletes user-generated data.
- **UUID primary keys** on every table, MySQL only (never PostgreSQL-specific SQL —
  this is a permanent decision, see `CLAUDE.md`).
- **Local file storage** under `uploads/`, never S3/MinIO — another permanent decision.
- **Winston logging only** — no `console.log` anywhere in application code.
- **Global response envelope + exception filters** — a controller never returns a raw
  Prisma object or a generic `Error`.
- Every schema change ships with its migration in the same commit — if you ever find a
  field in `schema.prisma` with no corresponding migration, that's a bug, not a style
  choice (this happened once, 22 Sep 2026, and broke the entire Dispute feature until
  fixed).

## Known gaps (as of 22 Sep 2026)

- Razorpay is test-mode only — see §15.
- Referral program is single-level, not the 3-tier structure in the original spec — see §6.
- AI Story has no mobile UI yet — see §10.
- Native Google/Apple mobile sign-in is code-complete but needs real OAuth credentials — see §1.
- Marketplace redemption has no live gift-card vendor integration — see §8.
- City list is a starter set, needs filling out before launch — see §12.
- No dispute workflow existed before 22 Sep 2026 (now built — see §4) for merchant-side
  disputes (fraud-flag/clawback disputes) — only the user-submission dispute path exists.
- No merchant auto-recharge, no social features (friends/chat/groups), no merchant
  CRM/loyalty, no agency/multi-tenant dashboards — all explicitly deferred, not started.
