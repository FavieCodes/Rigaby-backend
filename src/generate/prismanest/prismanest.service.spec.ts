import { Test, TestingModule } from '@nestjs/testing';
import { PrismanestService } from './prismanest.service';

describe('PrismanestService', () => {
  let service: PrismanestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismanestService],
    }).compile();

    service = module.get<PrismanestService>(PrismanestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
