-- Bank account text fields are now trimmed on the way in (AddBankDto / UpdateBankDto). This cleans rows saved before
-- that with leading or trailing spaces, tabs or newlines. TRIM() alone only removes spaces, hence the regex.
-- The account number and UPI ID are encrypted and were already validated strictly, so they are not touched here; nor
-- is the IFSC code, whose validator never accepted whitespace. A no-op on a database with nothing to fix.

UPDATE `merchant_bank_accounts`
SET `bankName` = REGEXP_REPLACE(`bankName`, '^[[:space:]]+|[[:space:]]+$', '')
WHERE `bankName` REGEXP '^[[:space:]]|[[:space:]]$';

UPDATE `merchant_bank_accounts`
SET `accountHolderName` = REGEXP_REPLACE(`accountHolderName`, '^[[:space:]]+|[[:space:]]+$', '')
WHERE `accountHolderName` REGEXP '^[[:space:]]|[[:space:]]$';

UPDATE `merchant_bank_accounts`
SET `branch` = NULLIF(REGEXP_REPLACE(`branch`, '^[[:space:]]+|[[:space:]]+$', ''), '')
WHERE `branch` REGEXP '^[[:space:]]|[[:space:]]$';
