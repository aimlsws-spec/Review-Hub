-- AlterTable
ALTER TABLE `devices` ADD COLUMN `isEmulator` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isRooted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `riskScore` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `vpnSuspected` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `devices_riskScore_idx` ON `devices`(`riskScore`);
