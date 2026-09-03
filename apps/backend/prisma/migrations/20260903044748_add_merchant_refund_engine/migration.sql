-- AlterTable
ALTER TABLE `merchant_wallets` ADD COLUMN `refundBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `totalRefunded` DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `merchant_refund_requests` (
    `id` VARCHAR(191) NOT NULL,
    `merchantWalletId` VARCHAR(191) NOT NULL,
    `bankAccountId` VARCHAR(191) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `reason` TEXT NULL,
    `status` ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `rejectionReason` TEXT NULL,
    `processedBy` VARCHAR(191) NULL,
    `processedAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `merchant_refund_requests_merchantWalletId_idx`(`merchantWalletId`),
    INDEX `merchant_refund_requests_status_idx`(`status`),
    INDEX `merchant_refund_requests_processedBy_idx`(`processedBy`),
    INDEX `merchant_refund_requests_createdAt_idx`(`createdAt`),
    INDEX `merchant_refund_requests_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchant_refund_logs` (
    `id` VARCHAR(191) NOT NULL,
    `refundId` VARCHAR(191) NOT NULL,
    `oldStatus` ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED', 'REJECTED', 'CANCELLED') NOT NULL,
    `newStatus` ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED', 'REJECTED', 'CANCELLED') NOT NULL,
    `remarks` TEXT NULL,
    `changedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `merchant_refund_logs_refundId_idx`(`refundId`),
    INDEX `merchant_refund_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `merchant_refund_requests` ADD CONSTRAINT `merchant_refund_requests_merchantWalletId_fkey` FOREIGN KEY (`merchantWalletId`) REFERENCES `merchant_wallets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_refund_requests` ADD CONSTRAINT `merchant_refund_requests_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `merchant_bank_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_refund_logs` ADD CONSTRAINT `merchant_refund_logs_refundId_fkey` FOREIGN KEY (`refundId`) REFERENCES `merchant_refund_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
