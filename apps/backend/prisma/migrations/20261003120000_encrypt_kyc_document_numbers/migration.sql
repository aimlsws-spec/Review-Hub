-- KYC document numbers (PAN, Aadhaar, ...) and the PAN copied onto TDS deductions become encrypted (see
-- apps/backend/src/shared/crypto/identity-number-protector.ts). Existing rows keep their plain values until
-- `npm run db:encrypt-bank-details` encrypts them and fills the hash column; the deploy script runs it straight after
-- these migrations, and the app reads plain values until then.

-- DropIndex
DROP INDEX `user_kyc_documents_documentType_documentNumber_idx` ON `user_kyc_documents`;

-- AlterTable
ALTER TABLE `user_kyc_documents` ADD COLUMN `documentNumberHash` VARCHAR(64) NULL,
    MODIFY `documentNumber` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `tds_deductions` MODIFY `panNumber` VARCHAR(255) NULL;

-- CreateIndex
CREATE INDEX `user_kyc_documents_documentType_documentNumberHash_idx` ON `user_kyc_documents`(`documentType`, `documentNumberHash`);
