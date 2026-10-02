-- Bank account numbers and UPI IDs become encrypted (see apps/backend/src/shared/crypto). Existing rows keep their
-- plain values until `npm run db:encrypt-bank-details` encrypts them and fills the hash and last-four columns; the
-- deploy script runs it straight after these migrations, and the app reads plain values until then.

-- DropIndex
DROP INDEX `merchant_bank_accounts_merchantId_accountNumber_ifscCode_key` ON `merchant_bank_accounts`;

-- DropIndex
DROP INDEX `user_bank_accounts_userId_accountNumber_ifscCode_key` ON `user_bank_accounts`;

-- DropIndex
DROP INDEX `user_bank_accounts_accountNumber_ifscCode_idx` ON `user_bank_accounts`;

-- AlterTable
ALTER TABLE `merchant_bank_accounts` ADD COLUMN `accountNumberHash` VARCHAR(64) NULL,
    ADD COLUMN `accountNumberLast4` VARCHAR(4) NULL,
    MODIFY `accountNumber` VARCHAR(255) NOT NULL,
    MODIFY `upiId` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `user_bank_accounts` ADD COLUMN `accountNumberHash` VARCHAR(64) NULL,
    ADD COLUMN `accountNumberLast4` VARCHAR(4) NULL,
    MODIFY `accountNumber` VARCHAR(255) NOT NULL,
    MODIFY `upiId` VARCHAR(255) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `merchant_bank_accounts_merchantId_accountNumberHash_ifscCode_key` ON `merchant_bank_accounts`(`merchantId`, `accountNumberHash`, `ifscCode`);

-- CreateIndex
CREATE UNIQUE INDEX `user_bank_accounts_userId_accountNumberHash_ifscCode_key` ON `user_bank_accounts`(`userId`, `accountNumberHash`, `ifscCode`);

-- CreateIndex
CREATE INDEX `user_bank_accounts_accountNumberHash_ifscCode_idx` ON `user_bank_accounts`(`accountNumberHash`, `ifscCode`);
