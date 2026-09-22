-- AlterTable
ALTER TABLE `devices` ADD COLUMN `installId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `submission_attachments` ADD COLUMN `evidenceText` TEXT NULL,
    ADD COLUMN `perceptualHash` BIGINT NULL;

-- AlterTable
ALTER TABLE `submission_fraud_flags` ADD COLUMN `type` ENUM('DUPLICATE_SUBMISSION', 'MANIPULATED_IMAGE', 'VPN_DETECTED', 'MULTIPLE_ACCOUNTS', 'REFERRAL_ABUSE', 'RAPID_SUBMISSIONS', 'SUSPICIOUS_DEVICE', 'BLACKLISTED_IP', 'AI_GENERATED') NULL;

-- CreateIndex
CREATE INDEX `devices_installId_idx` ON `devices`(`installId`);

-- CreateIndex
CREATE INDEX `login_history_ipAddress_loginAt_idx` ON `login_history`(`ipAddress`, `loginAt`);

-- CreateIndex
CREATE INDEX `user_kyc_documents_documentType_documentNumber_idx` ON `user_kyc_documents`(`documentType`, `documentNumber`);

-- CreateIndex
CREATE INDEX `submission_attachments_createdAt_idx` ON `submission_attachments`(`createdAt`);

-- CreateIndex
CREATE INDEX `submission_fraud_flags_type_idx` ON `submission_fraud_flags`(`type`);

-- CreateIndex
CREATE INDEX `user_bank_accounts_accountNumber_ifscCode_idx` ON `user_bank_accounts`(`accountNumber`, `ifscCode`);

