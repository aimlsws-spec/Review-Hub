-- Every outbound AI call is now logged in ai_usage_logs (AiCallLogService): what it was for, how long it took, how it
-- ended, estimated tokens and cost. A call need not belong to a configured provider, so providerId becomes optional.

-- DropForeignKey
ALTER TABLE `ai_usage_logs` DROP FOREIGN KEY `ai_usage_logs_providerId_fkey`;

-- AlterTable
ALTER TABLE `ai_usage_logs` ADD COLUMN `feature` VARCHAR(40) NOT NULL DEFAULT 'UNKNOWN',
    ADD COLUMN `model` VARCHAR(100) NULL,
    ADD COLUMN `promptVersion` VARCHAR(40) NULL,
    ADD COLUMN `inputTokens` INTEGER NULL,
    ADD COLUMN `outputTokens` INTEGER NULL,
    ADD COLUMN `confidence` DECIMAL(5, 4) NULL,
    MODIFY `providerId` VARCHAR(191) NULL,
    MODIFY `responseStatus` ENUM('SUCCESS', 'FAILED', 'TIMEOUT', 'RATE_LIMITED', 'FALLBACK') NOT NULL DEFAULT 'SUCCESS';

-- CreateIndex
CREATE INDEX `ai_usage_logs_feature_createdAt_idx` ON `ai_usage_logs`(`feature`, `createdAt`);

-- AddForeignKey
ALTER TABLE `ai_usage_logs` ADD CONSTRAINT `ai_usage_logs_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `ai_providers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
