import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Game } from './game.entity';
import { Image } from '../images/image.entity';
import { Platform } from '../platforms/platform.entity';
import { Genre } from '../genres/genre.entity';
import { Developer } from '../developers/developer.entity';

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
    @InjectRepository(Genre)
    private genreRepository: Repository<Genre>,
    @InjectRepository(Developer)
    private developerRepository: Repository<Developer>,
  ) {}

  async create(
    game: Partial<Game> & {
      platforms?: number[];
      genres?: number[];
      developers?: number[];
    },
  ): Promise<Game> {
    const { platforms, genres, developers, ...gameData } = game;

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

    // Verifica si se han proporcionado géneros
    if (genres && genres.length > 0) {
      // Busca los géneros en la base de datos usando los IDs proporcionados
      const foundGenres = await this.genreRepository.find({
        where: { id: In(genres) },
      });

      // Verifica si todos los géneros solicitados fueron encontrados
      if (foundGenres.length !== genres.length) {
        throw new NotFoundException('Uno o más géneros no encontrados');
      }

      // Asigna los géneros encontrados al nuevo juego
      newGame.genres = foundGenres;
    }

    // Verifica si se han proporcionado desarrolladores
    if (developers && developers.length > 0) {
      // Busca los desarrolladores en la base de datos usando los IDs proporcionados
      const foundDevelopers = await this.developerRepository.find({
        where: { id: In(developers) },
      });

      // Verifica si todos los desarrolladores solicitados fueron encontrados
      if (foundDevelopers.length !== developers.length) {
        throw new NotFoundException('Uno o más desarrolladores no encontrados');
      }

      // Asigna los desarrolladores encontrados al nuevo juego
      newGame.developers = foundDevelopers;
    }

    // Guarda el nuevo juego en la base de datos
    return this.gamesRepository.save(newGame);
  }

  async findAll(): Promise<Game[]> {
    return this.gamesRepository.find({
      relations: ['platforms', 'images', 'genres', 'developers'],
    });
  }

  async findOne(id: number): Promise<Game> {
    const game = await this.gamesRepository.findOne({
      where: { id },
      relations: ['platforms', 'images', 'genres', 'developers'],
    });
    if (!game) {
      throw new NotFoundException(`Game with ID ${id} not found`);
    }
    return game;
  }

  async update(
    id: number,
    gameData: Partial<Game> & {
      platforms?: number[];
      genres?: number[];
      developers?: number[];
    },
  ): Promise<Game> {
    const game = await this.gamesRepository.findOne({
      where: { id },
      relations: ['platforms', 'genres', 'developers', 'images'],
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

    // Si se proporcionan IDs de género, actualízalos
    if (gameData.genres && Array.isArray(gameData.genres)) {
      const genres = await this.genreRepository.findBy({
        id: In(gameData.genres),
      });
      if (genres.length !== gameData.genres.length) {
        throw new NotFoundException('Uno o más géneros no encontrados');
      }
      game.genres = genres;
    }

    // Si se proporcionan IDs de desarrollador, actualízalos
    if (gameData.developers && Array.isArray(gameData.developers)) {
      const developers = await this.developerRepository.findBy({
        id: In(gameData.developers),
      });
      if (developers.length !== gameData.developers.length) {
        throw new NotFoundException('Uno o más desarrolladores no encontrados');
      }
      game.developers = developers;
    }

    // Actualiza otros campos
    const { platforms, genres, developers, ...otherData } = gameData;
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
      relations: ['images', 'platforms', 'genres', 'developers'],
    });

    if (!game) {
      throw new NotFoundException('Juego no encontrado');
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
      relations: ['images', 'platforms', 'genres', 'developers'],
    });
  }

  async getHomeGames(limit: number = 6): Promise<Game[]> {
    const games = await this.gamesRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.images', 'image')
      .leftJoinAndSelect('game.platforms', 'platform')
      .leftJoinAndSelect('game.genres', 'genre')
      .leftJoinAndSelect('game.developers', 'developer')
      .where('game.coverId IS NOT NULL')
      .orderBy('RAND()')
      .take(limit)
      .getMany();

    return games;
  }

  async getGamesForDataTable(dataTableOptions: {
    page: number;
    limit: number;
    sortField?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ data: Game[]; total: number; totalPages: number }> {
    const { page, limit, sortField, sortOrder } = dataTableOptions;
    const skip = (page - 1) * limit;

    const queryBuilder = this.gamesRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.platforms', 'platform')
      .leftJoinAndSelect('game.genres', 'genre')
      .leftJoinAndSelect('game.developers', 'developer')
      .leftJoinAndSelect('game.images', 'image');

    if (sortField && sortOrder) {
      queryBuilder.orderBy(`game.${sortField}`, sortOrder);
    }

    const [games, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return { data: games, total, totalPages };
  }
}
