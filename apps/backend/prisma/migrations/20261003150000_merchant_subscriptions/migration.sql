-- Merchant subscription plans, paid from the merchant wallet, and paid featured campaigns. Service charges get GST
-- invoices too, so an invoice now belongs to either a settlement or a service charge. The plans below are examples,
-- inserted switched OFF: the owner sets real prices and benefits before switching any on.

-- DropForeignKey
ALTER TABLE `invoices` DROP FOREIGN KEY `invoices_settlementId_fkey`;

-- AlterTable
ALTER TABLE `invoices` ADD COLUMN `serviceChargeId` VARCHAR(191) NULL,
    MODIFY `settlementId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `platform_configuration` ADD COLUMN `featuredCampaignPrice` DECIMAL(12, 2) NOT NULL DEFAULT 199,
    ADD COLUMN `featuredCampaignDays` INTEGER NOT NULL DEFAULT 7;

-- CreateTable
CREATE TABLE `subscription_plans` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `description` TEXT NULL,
    `monthlyPrice` DECIMAL(12, 2) NOT NULL,
    `maxActiveCampaigns` INTEGER NULL,
    `featuredSlots` INTEGER NOT NULL DEFAULT 0,
    `isPremium` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `subscription_plans_code_key`(`code`),
    INDEX `subscription_plans_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchant_subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `merchantId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'PAST_DUE', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `autoRenew` BOOLEAN NOT NULL DEFAULT true,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `merchant_subscriptions_merchantId_status_idx`(`merchantId`, `status`),
    INDEX `merchant_subscriptions_status_periodEnd_idx`(`status`, `periodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchant_service_charges` (
    `id` VARCHAR(191) NOT NULL,
    `merchantId` VARCHAR(191) NOT NULL,
    `type` ENUM('SUBSCRIPTION', 'FEATURED_CAMPAIGN') NOT NULL,
    `subscriptionId` VARCHAR(191) NULL,
    `campaignId` VARCHAR(191) NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `taxableAmount` DECIMAL(12, 2) NOT NULL,
    `gstRate` DECIMAL(5, 2) NOT NULL,
    `gstAmount` DECIMAL(12, 2) NOT NULL,
    `totalAmount` DECIMAL(12, 2) NOT NULL,
    `walletTransactionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `merchant_service_charges_walletTransactionId_key`(`walletTransactionId`),
    INDEX `merchant_service_charges_merchantId_idx`(`merchantId`),
    UNIQUE INDEX `merchant_service_charges_subscriptionId_periodStart_key`(`subscriptionId`, `periodStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `invoices_serviceChargeId_key` ON `invoices`(`serviceChargeId`);

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_settlementId_fkey` FOREIGN KEY (`settlementId`) REFERENCES `settlements`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_serviceChargeId_fkey` FOREIGN KEY (`serviceChargeId`) REFERENCES `merchant_service_charges`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_subscriptions` ADD CONSTRAINT `merchant_subscriptions_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `merchants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_subscriptions` ADD CONSTRAINT `merchant_subscriptions_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `subscription_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_service_charges` ADD CONSTRAINT `merchant_service_charges_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `merchants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_service_charges` ADD CONSTRAINT `merchant_service_charges_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `merchant_subscriptions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Example plans, switched off.
INSERT INTO `subscription_plans` (`id`, `code`, `name`, `description`, `monthlyPrice`, `maxActiveCampaigns`, `featuredSlots`, `isPremium`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`)
SELECT UUID(), v.code, v.name, v.description, v.price, v.maxActive, v.slots, v.premium, false, v.sortOrder, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM (
  SELECT 'BASIC' AS code, 'Basic' AS name, 'Up to 2 campaigns at once.' AS description, 0 AS price, 2 AS maxActive, 0 AS slots, false AS premium, 1 AS sortOrder
  UNION ALL SELECT 'GROWTH', 'Growth', 'Up to 10 campaigns at once and 1 featured campaign included.', 999, 10, 1, false, 2
  UNION ALL SELECT 'PREMIUM', 'Premium', 'Unlimited campaigns, 5 featured campaigns included, and the Premium badge.', 2999, NULL, 5, true, 3
) AS v
WHERE NOT EXISTS (SELECT 1 FROM `subscription_plans` p WHERE p.`code` = v.code);
