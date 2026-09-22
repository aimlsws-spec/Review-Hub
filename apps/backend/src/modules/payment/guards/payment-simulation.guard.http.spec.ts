import { Controller, INestApplication, Post, UseGuards } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { PaymentSimulationGuard } from './payment-simulation.guard';

@Controller('simulate-probe')
class ProbeController {
  @Post()
  @UseGuards(PaymentSimulationGuard)
  simulate() {
    return { credited: true };
  }
}

/**
 * The guard is used inside modules that never import PaymentModule (Merchant, Wallet), so it must
 * resolve through the global ConfigService alone. This proves that over real HTTP.
 */
describe('PaymentSimulationGuard over HTTP', () => {
  const startApp = async (provider: string): Promise<INestApplication> => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ payment: { provider } })] })],
      controllers: [ProbeController],
    }).compile();
    const app = module.createNestApplication();
    await app.init();
    return app;
  };

  it('serves the endpoint while the mock gateway is active', async () => {
    const app = await startApp('mock');
    await request(app.getHttpServer()).post('/simulate-probe').expect(201);
    await app.close();
  });

  it('returns 404 for the endpoint when Razorpay is active', async () => {
    const app = await startApp('razorpay');
    await request(app.getHttpServer()).post('/simulate-probe').expect(404);
    await app.close();
  });
});
