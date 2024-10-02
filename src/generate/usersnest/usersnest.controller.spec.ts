import { Test, TestingModule } from '@nestjs/testing';
import { UsersnestController } from './usersnest.controller';

describe('UsersnestController', () => {
  let controller: UsersnestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersnestController],
    }).compile();

    controller = module.get<UsersnestController>(UsersnestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
