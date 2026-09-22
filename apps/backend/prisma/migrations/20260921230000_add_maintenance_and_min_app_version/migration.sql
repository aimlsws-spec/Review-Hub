-- AlterTable
ALTER TABLE `platform_configuration` ADD COLUMN `maintenanceMessage` VARCHAR(300) NULL,
    ADD COLUMN `minimumAppVersion` VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    ADD COLUMN `updateUrl` VARCHAR(500) NULL;
