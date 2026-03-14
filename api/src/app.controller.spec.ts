import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const mockConnection = { query: jest.fn() };

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: getConnectionToken(), useValue: mockConnection },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('returns the API info response', () => {
      const result = appController.getHello();
      expect(result).toBeDefined();
    });
  });
});
