-- "The AI checks and pays automatically" is retired: the AI only advises and a person (the merchant or an admin)
-- approves every reward. Tasks saved with that choice become "the AI checks, then a person decides", which is how
-- they now behave anyway (AiVerificationService.completeJob always hands the submission to a reviewer).
-- The enum keeps its AI value so no column changes. A no-op on a database with nothing to fix.

UPDATE `campaign_tasks`
SET `verificationType` = 'HYBRID'
WHERE `verificationType` = 'AI';
