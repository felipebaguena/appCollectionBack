import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GamesService } from './games.service';
import { Game } from './game.entity';

describe('GamesService', () => {
  let service: GamesService;
  let repo: Repository<Game>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
        {
          provide: getRepositoryToken(Game),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<GamesService>(GamesService);
    repo = module.get<Repository<Game>>(getRepositoryToken(Game));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully insert a game', async () => {
      const game = {
        title: 'Super Mario Odyssey',
        platform: 'Nintendo Switch',
        releaseYear: 2017,
        description: 'Un juego de plataformas 3D',
      };
      const gameEntity: Game = {
        id: 1,
        title: game.title,
        platform: game.platform,
        releaseYear: game.releaseYear,
        description: game.description,
      };
      jest.spyOn(repo, 'create').mockReturnValue(gameEntity);
      jest.spyOn(repo, 'save').mockResolvedValue(gameEntity);

      expect(await service.create(game)).toEqual(gameEntity);
    });
  });
});