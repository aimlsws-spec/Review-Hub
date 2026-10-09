-- Approving a merchant now also approves the KYC documents and verifies the bank accounts that were waiting on that
-- decision (MerchantRepository.approveWithDetails). Merchants approved before that change still show those rows as
-- PENDING on their Documents page; this brings them in line, as if they had been approved today.
--
-- Only rows that existed when the merchant was approved are touched, so a document or account added afterwards is not
-- passed without review. A merchant approved with no verifiedAt (seeded data) has everything brought in line.
-- Every statement is a no-op on a database with nothing to fix.

UPDATE `merchant_documents` d
INNER JOIN `merchants` m ON m.`id` = d.`merchantId`
SET d.`verificationStatus` = 'APPROVED',
    d.`verifiedBy` = m.`verifiedBy`,
    d.`verifiedAt` = COALESCE(m.`verifiedAt`, CURRENT_TIMESTAMP(3)),
    d.`rejectionReason` = NULL
WHERE m.`verificationStatus` = 'APPROVED'
  AND d.`deletedAt` IS NULL
  AND d.`verificationStatus` IN ('PENDING', 'UNDER_REVIEW')
  AND (m.`verifiedAt` IS NULL OR d.`createdAt` <= m.`verifiedAt`);

UPDATE `merchant_bank_accounts` b
INNER JOIN `merchants` m ON m.`id` = b.`merchantId`
SET b.`verificationStatus` = 'VERIFIED',
    b.`verifiedAt` = COALESCE(m.`verifiedAt`, CURRENT_TIMESTAMP(3))
WHERE m.`verificationStatus` = 'APPROVED'
  AND b.`deletedAt` IS NULL
  AND b.`verificationStatus` = 'PENDING'
  AND (m.`verifiedAt` IS NULL OR b.`createdAt` <= m.`verifiedAt`);
