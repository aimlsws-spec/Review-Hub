-- AlterTable
ALTER TABLE `user_kyc_documents` ADD COLUMN `ocrCheck` JSON NULL,
    ADD COLUMN `ocrCheckedAt` DATETIME(3) NULL;

