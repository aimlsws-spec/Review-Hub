-- AlterTable
ALTER TABLE `users` ADD COLUMN `googleId` VARCHAR(191) NULL,
    ADD COLUMN `appleId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_googleId_key` ON `users`(`googleId`);

-- CreateIndex
CREATE UNIQUE INDEX `users_appleId_key` ON `users`(`appleId`);
