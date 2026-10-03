-- AlterTable
ALTER TABLE `support_tickets` ADD COLUMN `campaignTaskId` VARCHAR(191) NULL,
    ADD COLUMN `submissionId` VARCHAR(191) NULL,
    MODIFY `category` ENUM('ACCOUNT', 'CAMPAIGN', 'PAYMENT', 'WITHDRAWAL', 'REWARD', 'BUG', 'GENERAL', 'TASK_ISSUE') NOT NULL DEFAULT 'GENERAL';

-- CreateIndex
CREATE INDEX `support_tickets_campaignTaskId_idx` ON `support_tickets`(`campaignTaskId`);

-- CreateIndex
CREATE INDEX `support_tickets_submissionId_idx` ON `support_tickets`(`submissionId`);

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_campaignTaskId_fkey` FOREIGN KEY (`campaignTaskId`) REFERENCES `campaign_tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `task_submissions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
