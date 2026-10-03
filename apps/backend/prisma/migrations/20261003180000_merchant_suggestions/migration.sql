-- Suggestions found by the daily campaign optimizer, kept for the merchant and to avoid repeating one within a week.

-- CreateTable
CREATE TABLE `merchant_suggestions` (
    `id` VARCHAR(191) NOT NULL,
    `merchantId` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NULL,
    `code` VARCHAR(60) NOT NULL,
    `severity` VARCHAR(20) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `detail` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dismissedAt` DATETIME(3) NULL,

    INDEX `merchant_suggestions_merchantId_createdAt_idx`(`merchantId`, `createdAt`),
    INDEX `merchant_suggestions_merchantId_code_campaignId_idx`(`merchantId`, `code`, `campaignId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `merchant_suggestions` ADD CONSTRAINT `merchant_suggestions_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `merchants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
