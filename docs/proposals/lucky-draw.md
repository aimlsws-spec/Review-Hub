# Proposal: lucky draw and monthly contest

**Status:** proposal only. Nothing is built. Do not build until the product owner has written the rules and an Indian
lawyer has confirmed the chosen design (decision of 3 Oct 2026).

## Why this needs care

A prize given out by chance, where people pay or do something of value to take part, can be a **lottery** or
**gambling** under Indian law. Rules differ by state:

- The Public Gambling Act 1867 and state acts (e.g. Tamil Nadu, Telangana, Andhra Pradesh, Karnataka) ban games of
  chance for stakes. Several states have their own online-gaming laws.
- The Lotteries (Regulation) Act 1998 lets only state governments run lotteries.
- Section 112 of the Bharatiya Nyaya Sanhita (organised gambling) and the consumer protection rules on unfair trade
  practices (misleading prize promotions) also apply.
- Prize money may attract **TDS under section 194B** (30% on winnings above the threshold), which the platform would
  have to deduct and report. This is separate from the section 194R TDS the platform already handles.

The platform's tasks earn money, so "complete tasks to enter a draw" can be read as paying to enter.

## Options, safest first

| Option | How it works | Legal risk | Notes |
|---|---|---|---|
| **A. Skill contest** (recommended) | Monthly leaderboard by a measurable skill outcome: e.g. best approval rate with at least 30 tasks, or most helpful verified reviews as judged by stated criteria. Fixed prizes for the top N. | Lowest: prizes by merit, not chance. | Re-uses the Top Earner job (`awardTopEarners`) pattern. Must not reward positive ratings (platform rule: honest feedback only). |
| **B. Free-entry sweepstake** | A draw anyone can enter without doing anything (e.g. a free "enter" button, one entry per verified account), plus optional extra entries for activity. | Medium: the free route must be genuinely equal; some states still object. | Needs published terms, eligibility (18+, India, excluded states), and a verifiable random draw. |
| **C. Activity-based draw** | Each completed task is an entry; a random winner each month. | Highest: likely a lottery in many states. | Not recommended. |

## What we need from the owner before building

1. Which option (A recommended).
2. Prize amounts per month, number of winners, and the budget source (platform marketing budget, never merchant funds).
3. Eligibility: minimum age, KYC/PAN verified only, excluded states, staff and fraud-flagged accounts excluded.
4. How winners are paid: wallet credit (as `BONUS`) or direct transfer, and who handles section 194B TDS.
5. Written terms and conditions (to publish as a CMS page and require acceptance, like the existing policy flow).
6. Written confirmation from a lawyer that the chosen design is lawful where we operate.

## Sketch of the build once approved (option A)

- `Contest` (month, metric, minimum activity, prizes as JSON, status) and `ContestWinner` (contest, user, rank, amount,
  paid at) models; admin page to create a contest and review winners before payout.
- A `contest-results` platform job on the 1st of each month: ranks users by the metric (IST month), excludes
  ineligible and fraud-flagged accounts, and stores the winners for admin review. Payout only after an admin approves,
  through the finance role, as a wallet `BONUS` credit with TDS where it applies.
- Mobile: contest card on the gamification screen (rules link, current rank), winners announced by notification.
