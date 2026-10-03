import { AdminRole, SystemRole } from '@common/enums';

import { FraudFlagController } from '../../admin/controllers/fraud-flag.controller';
import { AdminMerchantController } from '../../merchant/controllers/admin.controller';
import { AdminInvoiceController } from '../../settlement/controllers/admin-invoice.controller';
import { AdminSettlementController } from '../../settlement/controllers/admin-settlement.controller';
import { WithdrawalController } from '../../wallet/controllers/withdrawal.controller';
import { ROLES_KEY } from '../decorators';

/**
 * Every route that moves money is for the finance team and super admins only (FINANCE_ROLES). A plain admin account
 * can moderate and support, but not pay out. Listed here so a new @Roles on one of them is caught.
 */
describe('money routes', () => {
  const routes: Array<[string, object, string]> = [
    ['withdrawal approve', WithdrawalController.prototype, 'approve'],
    ['withdrawal reject', WithdrawalController.prototype, 'reject'],
    ['withdrawal mark paid', WithdrawalController.prototype, 'markPaid'],
    ['withdrawal mark failed', WithdrawalController.prototype, 'markFailed'],
    ['merchant refund approve', AdminMerchantController.prototype, 'approveRefund'],
    ['merchant refund reject', AdminMerchantController.prototype, 'rejectRefund'],
    ['manual top-up', AdminMerchantController.prototype, 'recordManualTopUp'],
    ['top-up approve', AdminMerchantController.prototype, 'approveTopUp'],
    ['top-up reject', AdminMerchantController.prototype, 'rejectTopUp'],
    ['top-up reverse', AdminMerchantController.prototype, 'reverseTopUp'],
    ['reward clawback', FraudFlagController.prototype, 'reverseReward'],
    ['settlement generate', AdminSettlementController.prototype, 'generate'],
    ['credit/debit note', AdminInvoiceController.prototype, 'issueNote'],
  ];

  it.each(routes)('%s is finance-only', (_label, prototype, method) => {
    const handler = (prototype as Record<string, unknown>)[method];
    expect(handler).toBeInstanceOf(Function);

    const roles = Reflect.getMetadata(ROLES_KEY, handler as object) as string[] | undefined;
    expect(roles).toEqual(expect.arrayContaining([AdminRole.FinanceTeam, AdminRole.SuperAdmin]));
    expect(roles).not.toContain(SystemRole.Admin);
  });
});
