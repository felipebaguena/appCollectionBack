import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserGame } from './user-game.entity';
import { User } from '../users/user.entity';
import { Game } from '../games/game.entity';
import { Platform } from '../platforms/platform.entity';
import { In } from 'typeorm';
import { MyCollectionSortType, CompleteFilterType } from './user-games.enum';

@Injectable()
export class UserGamesService {
  constructor(
    @InjectRepository(UserGame)
    private userGamesRepository: Repository<UserGame>,
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
    @InjectRepository(Platform)
    private platformRepository: Repository<Platform>,
  ) {}

  async addGameToCollection(
    userId: number,
    gameId: number,
    data: {
      rating?: number;
      status?: number;
      complete?: boolean;
      notes?: string;
      platformIds?: number[];
      owned?: boolean;
      wished?: boolean;
    },
  ): Promise<UserGame> {
    const existingEntry = await this.userGamesRepository.findOne({
      where: {
        user: { id: userId },
        game: { id: gameId },
      },
    });

    if (existingEntry && existingEntry.wished && data.owned) {
      Object.assign(existingEntry, {
        ...data,
        wished: false,
        owned: true,
      });

      return this.userGamesRepository.save(existingEntry);
    }

    if (existingEntry) {
      throw new BadRequestException('Este juego ya está en tu colección');
    }

    if (
      data.rating &&
      (data.rating < 0 || data.rating > 5 || data.rating % 0.5 !== 0)
    ) {
      throw new BadRequestException(
        'El rating debe estar entre 0 y 5 y ser múltiplo de 0.5',
      );
    }

    if (data.status && (data.status < 0 || data.status > 10)) {
      throw new BadRequestException('El status debe estar entre 0 y 10');
    }

    if (data.owned && data.wished) {
      throw new BadRequestException(
        'Un juego no puede estar en ambos estados: owned y wished',
      );
    }

    let platforms = [];
    if (data.platformIds && data.platformIds.length > 0) {
      platforms = await this.platformRepository.findBy({
        id: In(data.platformIds),
      });
      if (platforms.length !== data.platformIds.length) {
        throw new BadRequestException('Una o más plataformas no encontradas');
      }
    }

    const userGame = this.userGamesRepository.create({
      user: { id: userId },
      game: { id: gameId },
      platforms,
      ...data,
    });

    return this.userGamesRepository.save(userGame);
  }

  async updateGameDetails(
    userId: number,
    gameId: number,
    data: {
      rating?: number;
      status?: number;
      complete?: boolean;
      notes?: string;
      platformIds?: number[];
      owned?: boolean;
      wished?: boolean;
    },
  ): Promise<UserGame> {
    const userGame = await this.userGamesRepository.findOne({
      where: {
        user: { id: userId },
        game: { id: gameId },
      },
      relations: ['platforms'],
    });

    if (!userGame) {
      throw new NotFoundException('Juego no encontrado en tu colección');
    }

    if (
      data.rating &&
      (data.rating < 0 || data.rating > 5 || data.rating % 0.5 !== 0)
    ) {
      throw new BadRequestException(
        'El rating debe estar entre 0 y 5 y ser múltiplo de 0.5',
      );
    }

    if (data.status && (data.status < 0 || data.status > 10)) {
      throw new BadRequestException('El status debe estar entre 0 y 10');
    }

    if (data.owned && data.wished) {
      throw new BadRequestException(
        'Un juego no puede estar en ambos estados: owned y wished',
      );
    }

    if (data.platformIds) {
      const platforms = await this.platformRepository.findBy({
        id: In(data.platformIds),
      });
      if (platforms.length !== data.platformIds.length) {
        throw new BadRequestException('Una o más plataformas no encontradas');
      }
      userGame.platforms = platforms;
    }

    Object.assign(userGame, data);
    return this.userGamesRepository.save(userGame);
  }

  async removeGameFromCollection(
    userId: number,
    gameId: number,
  ): Promise<void> {
    const userGame = await this.userGamesRepository.findOne({
      where: {
        user: { id: userId },
        game: { id: gameId },
      },
    });

    if (!userGame) {
      throw new NotFoundException('Juego no encontrado en tu colección');
    }

    await this.userGamesRepository.remove(userGame);
  }

  async updateRating(
    userId: number,
    gameId: number,
    rating: number,
  ): Promise<UserGame> {
    if (rating < 0 || rating > 10) {
      throw new BadRequestException('La puntuación debe estar entre 0 y 10');
    }

    const userGame = await this.userGamesRepository.findOne({
      where: {
        user: { id: userId },
        game: { id: gameId },
      },
    });

    if (!userGame) {
      throw new NotFoundException('Juego no encontrado en tu colección');
    }

    userGame.rating = rating;
    return this.userGamesRepository.save(userGame);
  }

  async getUserCollection(
    userId: number,
    options: {
      collection: {
        page: number;
        limit: number;
        sortType: MyCollectionSortType;
      };
      filter?: {
        search?: string;
        platformIds?: number[];
        genreIds?: number[];
        developerIds?: number[];
        yearRange?: {
          start?: number;
          end?: number;
        };
        complete?: CompleteFilterType;
        ratingRange?: {
          start: number;
          end: number;
        };
        statusRange?: {
          start: number;
          end: number;
        };
        addedAtRange?: {
          start: string; // ISO date string
          end: string; // ISO date string
        };
      };
    },
  ): Promise<{
    data: {
      id: number;
      game: {
        id: number;
        title: string;
        coverImage?: {
          id: number;
          path: string;
        };
      };
      platforms: {
        id: number;
        name: string;
      }[];
      rating: number;
      status: number;
      complete: boolean;
      notes: string;
      addedAt: Date;
      owned: boolean;
      wished: boolean;
    }[];
    totalItems: number;
    totalPages: number;
  }> {
    const { collection, filter } = options;
    const { page, limit, sortType } = collection;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userGamesRepository
      .createQueryBuilder('userGame')
      .leftJoinAndSelect('userGame.game', 'game')
      .leftJoinAndSelect('game.images', 'image', 'image.id = game.coverId')
      .leftJoinAndSelect('userGame.platforms', 'platform')
      .leftJoinAndSelect('game.genres', 'genre')
      .leftJoinAndSelect('game.developers', 'developer')
      .where('userGame.user.id = :userId', { userId });

    // Aplicar filtros
    if (filter?.search) {
      queryBuilder.andWhere('game.title LIKE :search', {
        search: `%${filter.search}%`,
      });
    }

    if (filter?.platformIds?.length) {
      queryBuilder.andWhere('platform.id IN (:...platformIds)', {
        platformIds: filter.platformIds,
      });
    }

    if (filter?.genreIds?.length) {
      queryBuilder.andWhere('genre.id IN (:...genreIds)', {
        genreIds: filter.genreIds,
      });
    }

    if (filter?.developerIds?.length) {
      queryBuilder.andWhere('developer.id IN (:...developerIds)', {
        developerIds: filter.developerIds,
      });
    }

    if (filter?.yearRange?.start && filter?.yearRange?.end) {
      queryBuilder.andWhere('game.releaseYear BETWEEN :start AND :end', {
        start: filter.yearRange.start,
        end: filter.yearRange.end,
      });
    }

    // Filtro para complete
    if (filter?.complete) {
      switch (filter.complete) {
        case CompleteFilterType.COMPLETE:
          queryBuilder.andWhere('userGame.complete = :complete', {
            complete: true,
          });
          break;
        case CompleteFilterType.INCOMPLETE:
          queryBuilder.andWhere('userGame.complete = :complete', {
            complete: false,
          });
          break;
        // Para ALL no necesitamos añadir ninguna condición
      }
    }

    // Filtro para rating
    if (
      filter?.ratingRange?.start !== undefined &&
      filter?.ratingRange?.end !== undefined
    ) {
      queryBuilder.andWhere(
        'userGame.rating BETWEEN :ratingStart AND :ratingEnd',
        {
          ratingStart: filter.ratingRange.start,
          ratingEnd: filter.ratingRange.end,
        },
      );
    }

    // Filtro para status
    if (
      filter?.statusRange?.start !== undefined &&
      filter?.statusRange?.end !== undefined
    ) {
      queryBuilder.andWhere(
        'userGame.status BETWEEN :statusStart AND :statusEnd',
        {
          statusStart: filter.statusRange.start,
          statusEnd: filter.statusRange.end,
        },
      );
    }

    // Filtro para addedAt
    if (filter?.addedAtRange?.start && filter?.addedAtRange?.end) {
      queryBuilder.andWhere(
        'userGame.addedAt BETWEEN :addedStart AND :addedEnd',
        {
          addedStart: new Date(filter.addedAtRange.start),
          addedEnd: new Date(filter.addedAtRange.end),
        },
      );
    }

    // Ordenación
    switch (sortType) {
      case MyCollectionSortType.TITLE_ASC:
        queryBuilder.orderBy('game.title', 'ASC');
        break;
      case MyCollectionSortType.TITLE_DESC:
        queryBuilder.orderBy('game.title', 'DESC');
        break;
      case MyCollectionSortType.YEAR_ASC:
        queryBuilder.orderBy('game.releaseYear', 'ASC');
        break;
      case MyCollectionSortType.YEAR_DESC:
        queryBuilder.orderBy('game.releaseYear', 'DESC');
        break;
      case MyCollectionSortType.RATING_ASC:
        queryBuilder.orderBy('userGame.rating', 'ASC');
        queryBuilder.addOrderBy('game.title', 'ASC');
        break;
      case MyCollectionSortType.RATING_DESC:
        queryBuilder.orderBy('userGame.rating', 'DESC');
        queryBuilder.addOrderBy('game.title', 'ASC');
        break;
      case MyCollectionSortType.STATUS_ASC:
        queryBuilder.orderBy('userGame.status', 'ASC');
        queryBuilder.addOrderBy('game.title', 'ASC');
        break;
      case MyCollectionSortType.STATUS_DESC:
        queryBuilder.orderBy('userGame.status', 'DESC');
        queryBuilder.addOrderBy('game.title', 'ASC');
        break;
      case MyCollectionSortType.ADDED_ASC:
        queryBuilder.orderBy('userGame.addedAt', 'ASC');
        break;
      case MyCollectionSortType.ADDED_DESC:
        queryBuilder.orderBy('userGame.addedAt', 'DESC');
        break;
      default:
        queryBuilder.orderBy('userGame.addedAt', 'DESC');
    }

    const [userGames, totalItems] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: userGames.map((ug) => ({
        id: ug.id,
        game: {
          id: ug.game.id,
          title: ug.game.title,
          coverImage: ug.game.images?.[0]
            ? {
                id: ug.game.images[0].id,
                path: ug.game.images[0].path,
              }
            : undefined,
        },
        platforms: ug.platforms.map((platform) => ({
          id: platform.id,
          name: platform.name,
        })),
        rating: ug.rating,
        status: ug.status,
        complete: ug.complete,
        notes: ug.notes,
        addedAt: ug.addedAt,
        owned: ug.owned,
        wished: ug.wished,
      })),
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    };
  }

  async getUserGames(userId: number): Promise<
    {
      id: number;
      game: {
        id: number;
        title: string;
        coverImage?: {
          id: number;
          path: string;
        };
      };
      platforms: {
        id: number;
        name: string;
      }[];
      rating: number;
      status: number;
      complete: boolean;
      notes: string;
      addedAt: Date;
      owned: boolean;
      wished: boolean;
    }[]
  > {
    const userGames = await this.userGamesRepository
      .createQueryBuilder('userGame')
      .leftJoinAndSelect('userGame.game', 'game')
      .leftJoinAndSelect('game.images', 'image', 'image.id = game.coverId')
      .leftJoinAndSelect('userGame.platforms', 'platform')
      .where('userGame.user.id = :userId', { userId })
      .orderBy('userGame.addedAt', 'DESC')
      .getMany();

    return userGames.map((ug) => ({
      id: ug.id,
      game: {
        id: ug.game.id,
        title: ug.game.title,
        coverImage: ug.game.images?.[0]
          ? {
              id: ug.game.images[0].id,
              path: ug.game.images[0].path,
            }
          : undefined,
      },
      platforms: ug.platforms.map((platform) => ({
        id: platform.id,
        name: platform.name,
      })),
      rating: ug.rating,
      status: ug.status,
      complete: ug.complete,
      notes: ug.notes,
      addedAt: ug.addedAt,
      owned: ug.owned,
      wished: ug.wished,
    }));
  }

  async getUserGameDetails(
    userId: number,
    gameId: number,
  ): Promise<{
    id: number;
    game: {
      id: number;
      title: string;
      releaseYear: number;
      coverImage?: {
        id: number;
        path: string;
      };
      platforms: {
        id: number;
        name: string;
      }[];
    };
    platforms: {
      id: number;
      name: string;
    }[];
    rating: number;
    status: number;
    complete: boolean;
    notes: string;
    addedAt: Date;
    owned: boolean;
    wished: boolean;
  }> {
    const userGame = await this.userGamesRepository
      .createQueryBuilder('userGame')
      .leftJoinAndSelect('userGame.game', 'game')
      .leftJoinAndSelect('game.images', 'image', 'image.id = game.coverId')
      .leftJoinAndSelect('game.platforms', 'gamePlatform')
      .leftJoinAndSelect('userGame.platforms', 'userPlatform')
      .where('userGame.user.id = :userId', { userId })
      .andWhere('userGame.game.id = :gameId', { gameId })
      .getOne();

    if (!userGame) {
      throw new NotFoundException('Juego no encontrado en tu colección');
    }

    return {
      id: userGame.id,
      game: {
        id: userGame.game.id,
        title: userGame.game.title,
        releaseYear: userGame.game.releaseYear,
        coverImage: userGame.game.images?.[0]
          ? {
              id: userGame.game.images[0].id,
              path: userGame.game.images[0].path,
            }
          : undefined,
        platforms: userGame.game.platforms.map((platform) => ({
          id: platform.id,
          name: platform.name,
        })),
      },
      platforms: userGame.platforms.map((platform) => ({
        id: platform.id,
        name: platform.name,
      })),
      rating: userGame.rating,
      status: userGame.status,
      complete: userGame.complete,
      notes: userGame.notes,
      addedAt: userGame.addedAt,
      owned: userGame.owned,
      wished: userGame.wished,
    };
  }
}
