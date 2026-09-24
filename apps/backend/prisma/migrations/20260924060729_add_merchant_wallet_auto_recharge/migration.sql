-- AlterTable
ALTER TABLE `merchant_wallets` ADD COLUMN `autoRechargeAmount` DECIMAL(12, 2) NULL,
    ADD COLUMN `autoRechargeEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `autoRechargeThreshold` DECIMAL(12, 2) NULL,
    ADD COLUMN `lastAutoRechargeAt` DATETIME(3) NULL;
