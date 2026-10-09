-- Merchants can no longer pick a reward type: every reward is money credited to the user's wallet. Campaigns saved
-- with another label (points, coupon, gift card, product, discount) were always paid in cash anyway (RewardProcessor
-- records every reward as CASH), so this only corrects the label. Rewards are not touched: they are all CASH already.
-- The enum keeps its other values so no column changes. A no-op on a database with nothing to fix.

UPDATE `campaigns`
SET `rewardType` = 'CASH'
WHERE `rewardType` <> 'CASH';
