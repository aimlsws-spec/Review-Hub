-- AlterTable
ALTER TABLE `withdrawal_requests` ADD COLUMN `paidAt` DATETIME(3) NULL,
    ADD COLUMN `payoutMode` ENUM('GATEWAY', 'MANUAL') NULL,
    ADD COLUMN `payoutReference` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user_bank_accounts` ADD COLUMN `detailsChangedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `platform_configuration` ADD COLUMN `bankCoolingHours` INTEGER NOT NULL DEFAULT 24,
    ADD COLUMN `dailyWithdrawalLimit` DECIMAL(12, 2) NOT NULL DEFAULT 50000,
    ADD COLUMN `monthlyWithdrawalLimit` DECIMAL(12, 2) NULL,
    ADD COLUMN `payoutMode` ENUM('GATEWAY', 'MANUAL') NOT NULL DEFAULT 'GATEWAY',
    MODIFY `minimumWithdrawal` DECIMAL(12, 2) NOT NULL DEFAULT 1000;

-- CreateIndex
CREATE UNIQUE INDEX `withdrawal_requests_payoutReference_key` ON `withdrawal_requests`(`payoutReference`);


-- The old default minimum was 100 and nothing read it: the rule the app actually enforced was a fixed 1000. An
-- untouched row is brought in line so that connecting this setting does not quietly lower the minimum.
UPDATE `platform_configuration` SET `minimumWithdrawal` = 1000 WHERE `minimumWithdrawal` = 100;
