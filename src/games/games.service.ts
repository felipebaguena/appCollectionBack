import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Game } from './game.entity';
import { Image } from '../images/image.entity';
import { Platform } from '../platforms/platform.entity';

@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);

  constructor(
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
    @InjectRepository(Image)
    private imagesRepository: Repository<Image>,
    @InjectRepository(Platform)
    private platformRepository: Repository<Platform>,
  ) {}

  async create(game: Partial<Game>): Promise<Game> {
    const { platforms, ...gameData } = game;

    // Crea una nueva instancia del juego con los datos proporcionados
    let newGame = this.gamesRepository.create(gameData);

    // Verifica si se han proporcionado plataformas
    if (platforms && platforms.length > 0) {
      // Busca las plataformas en la base de datos usando los IDs proporcionados
      const foundPlatforms = await this.platformRepository.find({
        where: { id: In(platforms) },
      });

      // Verifica si todas las plataformas solicitadas fueron encontradas
      if (foundPlatforms.length !== platforms.length) {
        throw new NotFoundException('Una o más plataformas no encontradas');
      }

      // Asigna las plataformas encontradas al nuevo juego
      newGame.platforms = foundPlatforms;
    }

    // Guarda el nuevo juego en la base de datos
    return this.gamesRepository.save(newGame);
  }

  findAll(): Promise<Game[]> {
    return this.gamesRepository.find({ relations: ['platforms', 'images'] });
  }

  async findOne(id: number): Promise<Game> {
    const game = await this.gamesRepository.findOne({
      where: { id },
      relations: ['platforms', 'images'],
    });
    if (!game) {
      throw new NotFoundException(`Game with ID ${id} not found`);
    }
    return game;
  }

  async update(
    id: number,
    gameData: Partial<Game> & { platforms?: number[] },
  ): Promise<Game> {
    const game = await this.gamesRepository.findOne({
      where: { id },
      relations: ['platforms', 'images'],
    });

    if (!game) {
      throw new NotFoundException(`Juego con ID ${id} no encontrado`);
    }

    // Si se proporcionan IDs de plataforma, actualízalos
    if (gameData.platforms && Array.isArray(gameData.platforms)) {
      const platforms = await this.platformRepository.findBy({
        id: In(gameData.platforms),
      });
      if (platforms.length !== gameData.platforms.length) {
        throw new NotFoundException('Una o más plataformas no encontradas');
      }
      game.platforms = platforms;
    }

    // Actualiza otros campos
    const { platforms, ...otherData } = gameData;
    Object.assign(game, otherData);

    // Guarda los cambios
    return this.gamesRepository.save(game);
  }

  async remove(id: number): Promise<void> {
    await this.gamesRepository.delete(id);
  }

  async findOneWithImages(id: number): Promise<Game> {
    const game = await this.gamesRepository.findOne({
      where: { id },
      relations: ['images'],
    });

    if (!game) {
      throw new Error('Juego no encontrado');
    }

    return game;
  }

  async setCover(gameId: number, imageId: number): Promise<Game> {
    const game = await this.gamesRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new Error('Juego no encontrado');
    }

    const image = await this.imagesRepository.findOne({
      where: { id: imageId, game: { id: gameId } },
    });
    if (!image) {
      throw new Error('Imagen no encontrada para este juego');
    }

    game.coverId = imageId;
    return this.gamesRepository.save(game);
  }

  async findAllWithImages(): Promise<Game[]> {
    return this.gamesRepository.find({
      relations: ['images', 'platforms'],
    });
  }

  async getHomeGames(limit: number = 9): Promise<Game[]> {
    const games = await this.gamesRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.images', 'image')
      .leftJoinAndSelect('game.platforms', 'platform')
      .orderBy('RAND()')
      .take(limit)
      .getMany();

    return games;
  }
}
