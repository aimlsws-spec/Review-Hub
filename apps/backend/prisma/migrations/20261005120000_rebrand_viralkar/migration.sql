-- Rebrand: the platform is Viralkar. Replace the legacy "ReviewHub" name in the
-- column default and in data that earlier seeds wrote into existing databases.
-- Every statement is a no-op on a database that never held the old name.

-- AlterTable
ALTER TABLE `platform_configuration` MODIFY `platformName` VARCHAR(191) NOT NULL DEFAULT 'Viralkar';

-- Platform configuration and settings
UPDATE `platform_configuration` SET `platformName` = 'Viralkar' WHERE `platformName` IN ('ReviewHub', 'Review Hub');
UPDATE `platform_configuration` SET `supportEmail` = REPLACE(`supportEmail`, '@reviewhub.com', '@viralkar.com') WHERE `supportEmail` LIKE '%@reviewhub.com';
UPDATE `system_settings` SET `value` = JSON_QUOTE('Viralkar') WHERE `key` = 'platform.name' AND JSON_UNQUOTE(`value`) IN ('ReviewHub', 'Review Hub');

-- Seeded staff accounts (admin@, superadmin@, ...). Skipped per row when the
-- new address already exists, so the unique index on email cannot fail.
UPDATE `users` u
LEFT JOIN `users` taken ON taken.`email` = REPLACE(u.`email`, '@reviewhub.com', '@viralkar.com')
SET u.`email` = REPLACE(u.`email`, '@reviewhub.com', '@viralkar.com')
WHERE u.`email` LIKE '%@reviewhub.com' AND taken.`id` IS NULL;

-- User-facing copy
UPDATE `notification_templates`
SET `subject` = REPLACE(REPLACE(`subject`, 'Review Hub', 'Viralkar'), 'ReviewHub', 'Viralkar'),
    `title`   = REPLACE(REPLACE(`title`, 'Review Hub', 'Viralkar'), 'ReviewHub', 'Viralkar'),
    `body`    = REPLACE(REPLACE(`body`, 'Review Hub', 'Viralkar'), 'ReviewHub', 'Viralkar')
WHERE `subject` LIKE '%Review%Hub%' OR `title` LIKE '%Review%Hub%' OR `body` LIKE '%Review%Hub%';

UPDATE `faqs`
SET `question` = REPLACE(REPLACE(`question`, 'Review Hub', 'Viralkar'), 'ReviewHub', 'Viralkar'),
    `answer`   = REPLACE(REPLACE(`answer`, 'Review Hub', 'Viralkar'), 'ReviewHub', 'Viralkar')
WHERE `question` LIKE '%Review%Hub%' OR `answer` LIKE '%Review%Hub%';

UPDATE `cms_pages`
SET `title`           = REPLACE(REPLACE(`title`, 'Review Hub', 'Viralkar'), 'ReviewHub', 'Viralkar'),
    `content`         = REPLACE(REPLACE(`content`, 'Review Hub', 'Viralkar'), 'ReviewHub', 'Viralkar'),
    `metaTitle`       = REPLACE(REPLACE(`metaTitle`, 'Review Hub', 'Viralkar'), 'ReviewHub', 'Viralkar'),
    `metaDescription` = REPLACE(REPLACE(`metaDescription`, 'Review Hub', 'Viralkar'), 'ReviewHub', 'Viralkar')
WHERE `title` LIKE '%Review%Hub%' OR `content` LIKE '%Review%Hub%' OR `metaTitle` LIKE '%Review%Hub%' OR `metaDescription` LIKE '%Review%Hub%';
