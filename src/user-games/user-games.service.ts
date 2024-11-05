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
    },
  ): Promise<UserGame> {
    const existingEntry = await this.userGamesRepository.findOne({
      where: {
        user: { id: userId },
        game: { id: gameId },
      },
    });

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
    options?: {
      page?: number;
      limit?: number;
      sortBy?: 'rating' | 'status' | 'addedAt';
      sortOrder?: 'ASC' | 'DESC';
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
    }[];
    totalItems: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'addedAt',
      sortOrder = 'DESC',
    } = options || {};

    const queryBuilder = this.userGamesRepository
      .createQueryBuilder('userGame')
      .leftJoinAndSelect('userGame.game', 'game')
      .leftJoinAndSelect('game.images', 'image', 'image.id = game.coverId')
      .leftJoinAndSelect('userGame.platforms', 'platform')
      .where('userGame.user.id = :userId', { userId })
      .orderBy(`userGame.${sortBy}`, sortOrder);

    const skip = (page - 1) * limit;
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
    };
  }
}
