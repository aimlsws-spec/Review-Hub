-- CreateTable
CREATE TABLE `merchant_manual_top_ups` (
    `id` VARCHAR(191) NOT NULL,
    `merchantWalletId` VARCHAR(191) NOT NULL,
    `walletTransactionId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `bankReference` VARCHAR(191) NOT NULL,
    `receivedOn` DATE NOT NULL,
    `note` VARCHAR(500) NULL,
    `recordedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `merchant_manual_top_ups_walletTransactionId_key`(`walletTransactionId`),
    UNIQUE INDEX `merchant_manual_top_ups_bankReference_key`(`bankReference`),
    INDEX `merchant_manual_top_ups_merchantWalletId_idx`(`merchantWalletId`),
    INDEX `merchant_manual_top_ups_recordedBy_idx`(`recordedBy`),
    INDEX `merchant_manual_top_ups_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `merchant_manual_top_ups` ADD CONSTRAINT `merchant_manual_top_ups_merchantWalletId_fkey` FOREIGN KEY (`merchantWalletId`) REFERENCES `merchant_wallets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_manual_top_ups` ADD CONSTRAINT `merchant_manual_top_ups_walletTransactionId_fkey` FOREIGN KEY (`walletTransactionId`) REFERENCES `wallet_transactions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

