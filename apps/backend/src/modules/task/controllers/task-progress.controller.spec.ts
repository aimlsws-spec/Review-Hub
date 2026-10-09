import { TaskProgressController } from './task-progress.controller';

describe('TaskProgressController', () => {
  const service = { joinedCampaigns: jest.fn(), campaignProgress: jest.fn() };
  const controller = new TaskProgressController(service as never);

  it('lists the signed-in person’s joined campaigns', async () => {
    const query = { status: 'COMPLETED', page: 1, limit: 20 };
    await controller.joined('user-1', query as never);
    expect(service.joinedCampaigns).toHaveBeenCalledWith('user-1', query);
  });

  it('returns their progress on one campaign', async () => {
    await controller.progress('user-1', 'campaign-1');
    expect(service.campaignProgress).toHaveBeenCalledWith('user-1', 'campaign-1');
  });
});
