-- DropForeignKey
ALTER TABLE `merchant_manual_top_ups` DROP FOREIGN KEY `merchant_manual_top_ups_walletTransactionId_fkey`;

-- AlterTable
ALTER TABLE `merchant_manual_top_ups` ADD COLUMN `decidedAt` DATETIME(3) NULL,
    ADD COLUMN `decidedBy` VARCHAR(191) NULL,
    ADD COLUMN `rejectedReference` VARCHAR(191) NULL,
    ADD COLUMN `rejectionReason` VARCHAR(500) NULL,
    ADD COLUMN `reversalReason` VARCHAR(500) NULL,
    ADD COLUMN `reversalTransactionId` VARCHAR(191) NULL,
    ADD COLUMN `reversedAt` DATETIME(3) NULL,
    ADD COLUMN `reversedBy` VARCHAR(191) NULL,
    ADD COLUMN `status` ENUM('PENDING_APPROVAL', 'COMPLETED', 'REJECTED', 'REVERSED') NOT NULL DEFAULT 'COMPLETED',
    MODIFY `walletTransactionId` VARCHAR(191) NULL,
    MODIFY `bankReference` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `platform_configuration` ADD COLUMN `manualTopUpApprovalThreshold` DECIMAL(12, 2) NOT NULL DEFAULT 100000;

-- CreateIndex
CREATE UNIQUE INDEX `merchant_manual_top_ups_reversalTransactionId_key` ON `merchant_manual_top_ups`(`reversalTransactionId`);

-- CreateIndex
CREATE INDEX `merchant_manual_top_ups_status_idx` ON `merchant_manual_top_ups`(`status`);

-- AddForeignKey
ALTER TABLE `merchant_manual_top_ups` ADD CONSTRAINT `merchant_manual_top_ups_walletTransactionId_fkey` FOREIGN KEY (`walletTransactionId`) REFERENCES `wallet_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_manual_top_ups` ADD CONSTRAINT `merchant_manual_top_ups_reversalTransactionId_fkey` FOREIGN KEY (`reversalTransactionId`) REFERENCES `wallet_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

