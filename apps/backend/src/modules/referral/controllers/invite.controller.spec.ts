import { InviteController } from './invite.controller';

describe('InviteController', () => {
  const inviteService = { destinationFor: jest.fn() };
  let controller: InviteController;

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new InviteController(inviteService as never);
  });

  it('redirects to where the service says, with a temporary redirect, so the destination can change', async () => {
    inviteService.destinationFor.mockResolvedValue('https://play.google.com/store/apps/details?id=x&referrer=code%3DABC123');
    const res = { redirect: jest.fn() };

    await controller.open('ABC123', res as never);

    expect(inviteService.destinationFor).toHaveBeenCalledWith('ABC123');
    expect(res.redirect).toHaveBeenCalledWith(302, 'https://play.google.com/store/apps/details?id=x&referrer=code%3DABC123');
  });

  it('does not redirect when the service refuses, so the error is what the person sees', async () => {
    inviteService.destinationFor.mockRejectedValue(new Error('refused'));
    const res = { redirect: jest.fn() };

    await expect(controller.open('bad code', res as never)).rejects.toThrow('refused');

    expect(res.redirect).not.toHaveBeenCalled();
  });
});
