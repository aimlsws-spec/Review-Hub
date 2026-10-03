# Proposal: Account Merge

## Overview
This document outlines the proposed design for merging two user accounts in VIRAL KAR. An account merge may be required when a user has accidentally created multiple accounts and wishes to consolidate their data, wallet balances, and history into a single primary account.

## Which Tables Move
When merging a secondary account into a primary account, the following entities will be updated to point to the primary account:

- **Wallet Balances and Ledger**: The secondary wallet balance should be added to the primary wallet balance. All `WalletTransaction` records must be reparented to the primary wallet ledger.
- **Rewards**: All records in the `Reward` table credited to the secondary user must be moved to the primary user.
- **Submissions**: Any campaign or task submissions from the secondary user must be moved to the primary user.
- **Referrals**: If the secondary account referred any users, those referrals will now be attributed to the primary account.
- **KYC**: The most complete/verified KYC record should be retained on the primary account. If the secondary account has verified KYC and the primary does not, the KYC records should be swapped.
- **Devices & Sessions**: Active devices and sessions for the secondary account should be migrated to the primary account so the user is not logged out.
- **Audit**: All `AuditLog` records referencing the secondary account must be reparented to the primary account.

## Conflicts
- **Two Wallets**: The secondary wallet will be closed, and its balance transferred to the primary wallet via a special merge transaction type (`MERGE_TRANSFER`).
- **Two PANs (KYC)**: If both accounts have verified, conflicting PANs, the merge must be manually reviewed or rejected. We cannot merge two distinct verified identities.
- **Unique Email/Phone**: The primary account retains its email and phone number. The secondary account's email and phone number will be soft-deleted or suffixed (e.g., `_merged_<id>`) to free them up, or the user can choose which to keep.

## Money and Tax Implications
- **TDS History**: TDS deductions are tied to the user's PAN. If the PANs match, the TDS history naturally aggregates. If they differ, see the conflict resolution above.
- **Withdrawals in Flight**: Any pending withdrawals on the secondary account must either be completed before the merge or cancelled and refunded to the secondary wallet before the merge occurs.

## Fraud Risks
- Fraudsters might use account merging to bypass bans or consolidate ill-gotten rewards.
- If either account has open fraud flags, the merge must be blocked.
- Account merge history should be explicitly tracked (e.g., `AccountMerge` table) to maintain an audit trail.

## Audit Trail and Reversibility
- **Audit Trail**: Every modified record will need an audit log entry indicating it was moved due to a merge. A dedicated `AccountMergeLog` will record the before and after state of both accounts.
- **Reversibility**: True reversibility is highly complex due to interleaved wallet transactions post-merge. Merges should be considered **irreversible**.

## Open Questions for the Owner
1. **Self-Serve vs. Support-Driven**: Should users be able to request merges themselves in the app, or is this strictly a manual operation performed by Customer Support?
2. **Limits**: Should there be a limit on how many times an account can be merged?
3. **Conflict Resolution Strategy**: How should we handle the situation where the user wants to keep the phone number of the primary account but the email of the secondary account?
