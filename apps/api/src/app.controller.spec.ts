import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const result = appController.getHealth();
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('search', () => {
    it('should return offers array', () => {
      const request = {
        location: 'New York',
        date: '2025-01-15',
        timeWindow: 'Evening',
        budget: 75,
      };

      const result = appController.search(request);

      expect(result).toHaveProperty('offers');
      expect(Array.isArray(result.offers)).toBe(true);
      expect(result.offers.length).toBeGreaterThan(0);
    });
  });
});
