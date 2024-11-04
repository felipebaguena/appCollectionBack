import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Game } from './game.entity';
import { Image } from '../images/image.entity';
import { Platform } from '../platforms/platform.entity';
import { Genre } from '../genres/genre.entity';
import { Developer } from '../developers/developer.entity';
import { CollectionSortType } from './games.enum';
import { UserGame } from 'src/user-games/user-game.entity';

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
    const game = await this.gamesRepository.findOne({
      where: { id },
      relations: ['images'],
    });

    if (!game) {
      throw new NotFoundException(`Game with ID ${id} not found`);
    }

    await this.gamesRepository.remove(game);
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

  async getGamesForDataTable(options: {
    dataTable: {
      page: number;
      limit: number;
      sortField?: string;
      sortOrder?: 'ASC' | 'DESC';
    };
    filter?: {
      search?: string;
      platformIds?: number[];
      genreIds?: number[];
      developerIds?: number[];
      yearRange?: {
        start?: number;
        end?: number;
      } | null;
    };
  }): Promise<{ data: Game[]; totalItems: number; totalPages: number }> {
    const { dataTable, filter } = options;
    const { page, limit, sortField, sortOrder } = dataTable;
    const skip = (page - 1) * limit;

    const queryBuilder = this.gamesRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.platforms', 'platform')
      .leftJoinAndSelect('game.genres', 'genre')
      .leftJoinAndSelect('game.developers', 'developer')
      .leftJoinAndSelect('game.images', 'image');

    if (filter?.search) {
      queryBuilder.andWhere('game.title LIKE :search', {
        search: `%${filter.search}%`,
      });
    }

    if (filter?.platformIds && filter.platformIds.length > 0) {
      queryBuilder.andWhere('platform.id IN (:...platformIds)', {
        platformIds: filter.platformIds,
      });
    }

    if (filter?.genreIds && filter.genreIds.length > 0) {
      queryBuilder.andWhere('genre.id IN (:...genreIds)', {
        genreIds: filter.genreIds,
      });
    }

    if (filter?.developerIds && filter.developerIds.length > 0) {
      queryBuilder.andWhere('developer.id IN (:...developerIds)', {
        developerIds: filter.developerIds,
      });
    }

    // Verificación más robusta para el rango de años
    if (filter?.yearRange && filter.yearRange.start && filter.yearRange.end) {
      queryBuilder.andWhere(
        'game.releaseYear BETWEEN :startYear AND :endYear',
        {
          startYear: filter.yearRange.start,
          endYear: filter.yearRange.end,
        },
      );
    }

    if (sortField && sortOrder) {
      queryBuilder.orderBy(`game.${sortField}`, sortOrder);
    }

    const [games, totalItems] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit);

    return { data: games, totalItems, totalPages };
  }

  async getGamesCollection(options: {
    collection: {
      page: number;
      limit: number;
      sortType: CollectionSortType;
    };
    filter?: {
      search?: string;
      platformIds?: number[];
      genreIds?: number[];
      developerIds?: number[];
      yearRange?: {
        start?: number;
        end?: number;
      } | null;
    };
    userId: number;
  }): Promise<{
    data: {
      id: number;
      title: string;
      releaseYear: number;
      coverImage: {
        id: number;
        path: string;
      } | null;
      platforms: {
        id: number;
        name: string;
      }[];
      inCollection: boolean;
    }[];
    totalItems: number;
    totalPages: number;
  }> {
    const { collection, filter, userId } = options;
    const { page, limit, sortType } = collection;
    const skip = (page - 1) * limit;

    const queryBuilder = this.gamesRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.images', 'image', 'image.id = game.coverId')
      .leftJoin(
        UserGame,
        'userGame',
        'userGame.gameId = game.id AND userGame.userId = :userId',
        { userId },
      )
      .leftJoin('game.platforms', 'platform')
      .select([
        'game.id as game_id',
        'game.title as game_title',
        'game.releaseYear as game_release_year',
        'image.id as image_id',
        'image.path as image_path',
        'MAX(userGame.id) as userGame_id',
        'GROUP_CONCAT(DISTINCT platform.id) as platform_ids',
        'GROUP_CONCAT(DISTINCT platform.name) as platform_names',
      ])
      .groupBy('game.id, game.title, game.releaseYear, image.id, image.path');

    // Aplicar filtros
    if (filter?.search) {
      queryBuilder.andWhere('game.title LIKE :search', {
        search: `%${filter.search}%`,
      });
    }

    if (filter?.platformIds && filter.platformIds.length > 0) {
      queryBuilder
        .innerJoin('game.platforms', 'platform')
        .andWhere('platform.id IN (:...platformIds)', {
          platformIds: filter.platformIds,
        });
    }

    if (filter?.genreIds && filter.genreIds.length > 0) {
      queryBuilder
        .innerJoin('game.genres', 'genre')
        .andWhere('genre.id IN (:...genreIds)', {
          genreIds: filter.genreIds,
        });
    }

    if (filter?.developerIds && filter.developerIds.length > 0) {
      queryBuilder
        .innerJoin('game.developers', 'developer')
        .andWhere('developer.id IN (:...developerIds)', {
          developerIds: filter.developerIds,
        });
    }

    if (filter?.yearRange && filter.yearRange.start && filter.yearRange.end) {
      queryBuilder.andWhere(
        'game.releaseYear BETWEEN :startYear AND :endYear',
        {
          startYear: filter.yearRange.start,
          endYear: filter.yearRange.end,
        },
      );
    }

    // Aplicar ordenación
    switch (sortType) {
      case CollectionSortType.TITLE_ASC:
        queryBuilder.orderBy('game_title', 'ASC');
        break;
      case CollectionSortType.TITLE_DESC:
        queryBuilder.orderBy('game_title', 'DESC');
        break;
      case CollectionSortType.YEAR_ASC:
        queryBuilder.orderBy('game_release_year', 'ASC');
        break;
      case CollectionSortType.YEAR_DESC:
        queryBuilder.orderBy('game_release_year', 'DESC');
        break;
    }

    if (
      sortType === CollectionSortType.YEAR_ASC ||
      sortType === CollectionSortType.YEAR_DESC
    ) {
      queryBuilder.addOrderBy('game_title', 'ASC');
    }

    // Primero obtener el total de items
    const totalItems = await queryBuilder.getCount();

    // Luego aplicar la paginación y obtener los resultados
    const games = await queryBuilder.offset(skip).limit(limit).getRawMany();

    return {
      data: games.map((game) => ({
        id: game.game_id,
        title: game.game_title,
        releaseYear: game.game_release_year,
        coverImage: game.image_id
          ? {
              id: game.image_id,
              path: game.image_path,
            }
          : null,
        platforms: game.platform_ids
          ? game.platform_ids.split(',').map((id: string, index: number) => ({
              id: parseInt(id),
              name: game.platform_names.split(',')[index],
            }))
          : [],
        inCollection: Boolean(game.userGame_id),
      })),
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    };
  }
}
