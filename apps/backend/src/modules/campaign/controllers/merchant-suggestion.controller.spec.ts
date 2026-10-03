import { MERCHANT_TEAM_ROLES_KEY } from '../../merchant/constants';
import { CampaignOptimizerService } from '../services/campaign-optimizer.service';

import { MerchantSuggestionController } from './merchant-suggestion.controller';

describe('MerchantSuggestionController', () => {
  const optimizer = { listOpen: jest.fn(), dismiss: jest.fn() };
  const controller = new MerchantSuggestionController(optimizer as unknown as CampaignOptimizerService);

  it('lists and dismisses for the merchant in the path', async () => {
    await controller.list('m-1');
    await controller.dismiss('m-1', 's-1');

    expect(optimizer.listOpen).toHaveBeenCalledWith('m-1');
    expect(optimizer.dismiss).toHaveBeenCalledWith('m-1', 's-1');
  });

  it('lets campaign staff dismiss, not viewers', () => {
    expect(Reflect.getMetadata(MERCHANT_TEAM_ROLES_KEY, MerchantSuggestionController.prototype.dismiss)).toEqual(['OWNER', 'ADMIN', 'MANAGER']);
  });
});
