-- AlterTable
ALTER TABLE `campaign_tasks` ADD COLUMN `completionLimit` ENUM('ONCE', 'DAILY', 'WEEKLY', 'MONTHLY') NOT NULL DEFAULT 'ONCE',
    ADD COLUMN `maxCompletionsPerPeriod` INTEGER NOT NULL DEFAULT 1;
