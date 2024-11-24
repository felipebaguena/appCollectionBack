import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RolesService } from '../roles/roles.service';
import { ProfileStats } from './interfaces/profile-stats.interface';
import { UpdateUserDto } from './interfaces/update-user.interface';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { YearlyStats } from './interfaces/yearly-stats.interface';
import { Friendship, FriendshipStatus } from './friendship.entity';
import { FriendRequest } from './interfaces/friend-request.interface';
import { FriendDetail } from './interfaces/friend-detail.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Friendship)
    private friendshipsRepository: Repository<Friendship>,
    private jwtService: JwtService,
    private rolesService: RolesService,
  ) {}

  async create(user: Partial<User>): Promise<User> {
    // Verificar si el nik ya existe
    if (user.nik) {
      const existingUser = await this.usersRepository.findOne({
        where: { nik: user.nik },
      });
      if (existingUser) {
        throw new UnauthorizedException('El nik ya está en uso');
      }
    }

    if (user.password) {
      const salt = await bcrypt.genSalt();
      user.password = await bcrypt.hash(user.password, salt);
    }

    const defaultRole = await this.rolesService.findOrCreate('USER');
    const newUser = this.usersRepository.create({
      ...user,
      role: defaultRole,
    });
    return this.usersRepository.save(newUser);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOneByEmail(email: string): Promise<User | undefined> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['role'],
      select: ['id', 'name', 'nik', 'email', 'password', 'role', 'avatarPath'],
    });
  }

  async getUserInfoFromToken(
    token: string,
  ): Promise<{ id: number; name: string; avatarPath: string }> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.usersRepository.findOne({
        where: { email: payload.email },
      });
      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }
      return {
        id: user.id,
        name: user.name,
        avatarPath: user.avatarPath,
      };
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }
  }

  async updateRole(userId: number, roleName: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });
    if (!user) {
      throw new Error('User not found');
    }
    const newRole = await this.rolesService.findOrCreate(roleName);
    user.role = newRole;
    return this.usersRepository.save(user);
  }

  async getProfileStats(userId: number): Promise<ProfileStats> {
    const recentOwnedGames = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userGames', 'userGame')
      .leftJoinAndSelect('userGame.game', 'game')
      .leftJoinAndSelect('game.images', 'image', 'game.coverId = image.id')
      .where('user.id = :userId', { userId })
      .andWhere('userGame.owned = :owned', { owned: true })
      .orderBy('userGame.addedAt', 'DESC')
      .limit(5)
      .getOne();

    const recentWishedGames = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userGames', 'userGame')
      .leftJoinAndSelect('userGame.game', 'game')
      .leftJoinAndSelect('game.images', 'image', 'game.coverId = image.id')
      .where('user.id = :userId', { userId })
      .andWhere('userGame.wished = :wished', { wished: true })
      .orderBy('userGame.addedAt', 'DESC')
      .limit(5)
      .getOne();

    const totalStats = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoin('user.userGames', 'userGame')
      .where('user.id = :userId', { userId })
      .select([
        'COUNT(CASE WHEN userGame.owned = true THEN 1 END) as ownedGames',
        'COUNT(CASE WHEN userGame.wished = true THEN 1 END) as wishedGames',
        'COUNT(*) as totalGames',
      ])
      .getRawOne();

    // Obtener la plataforma favorita
    const favoritePlatform = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoin('user.userGames', 'userGame')
      .leftJoin('userGame.platforms', 'platform')
      .where('user.id = :userId', { userId })
      .andWhere('userGame.owned = :owned', { owned: true })
      .select([
        'platform.id as id',
        'platform.name as name',
        'platform.code as code',
        'COUNT(userGame.id) as gamesCount',
      ])
      .groupBy('platform.id')
      .orderBy('gamesCount', 'DESC')
      .limit(1)
      .getRawOne();

    // Obtener el género favorito
    const favoriteGenre = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoin('user.userGames', 'userGame')
      .leftJoin('userGame.game', 'game')
      .leftJoin('game.genres', 'genre')
      .where('user.id = :userId', { userId })
      .andWhere('userGame.owned = :owned', { owned: true })
      .select([
        'genre.id as id',
        'genre.name as name',
        'genre.code as code',
        'COUNT(userGame.id) as gamesCount',
      ])
      .groupBy('genre.id')
      .orderBy('gamesCount', 'DESC')
      .limit(1)
      .getRawOne();

    // Obtener el desarrollador favorito
    const favoriteDeveloper = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoin('user.userGames', 'userGame')
      .leftJoin('userGame.game', 'game')
      .leftJoin('game.developers', 'developer')
      .where('user.id = :userId', { userId })
      .andWhere('userGame.owned = :owned', { owned: true })
      .select([
        'developer.id as id',
        'developer.name as name',
        'developer.code as code',
        'COUNT(userGame.id) as gamesCount',
      ])
      .groupBy('developer.id')
      .orderBy('gamesCount', 'DESC')
      .limit(1)
      .getRawOne();

    return {
      recentOwnedGames:
        recentOwnedGames?.userGames
          .filter((ug) => ug.owned)
          .map((ug) => ({
            id: ug.game.id,
            title: ug.game.title,
            addedAt: ug.addedAt,
            coverImage: ug.game.images?.[0]
              ? {
                  id: ug.game.images[0].id,
                  path: ug.game.images[0].path,
                }
              : undefined,
          })) || [],
      recentWishedGames:
        recentWishedGames?.userGames
          .filter((ug) => ug.wished)
          .map((ug) => ({
            id: ug.game.id,
            title: ug.game.title,
            addedAt: ug.addedAt,
            coverImage: ug.game.images?.[0]
              ? {
                  id: ug.game.images[0].id,
                  path: ug.game.images[0].path,
                }
              : undefined,
          })) || [],
      totalStats: {
        ownedGames: parseInt(totalStats.ownedGames) || 0,
        wishedGames: parseInt(totalStats.wishedGames) || 0,
        totalGames: parseInt(totalStats.totalGames) || 0,
      },
      favoritePlatform: favoritePlatform
        ? {
            id: favoritePlatform.id,
            name: favoritePlatform.name,
            code: favoritePlatform.code,
            gamesCount: parseInt(favoritePlatform.gamesCount),
          }
        : undefined,
      favoriteGenre: favoriteGenre
        ? {
            id: favoriteGenre.id,
            name: favoriteGenre.name,
            code: favoriteGenre.code,
            gamesCount: parseInt(favoriteGenre.gamesCount),
          }
        : undefined,
      favoriteDeveloper: favoriteDeveloper
        ? {
            id: favoriteDeveloper.id,
            name: favoriteDeveloper.name,
            code: favoriteDeveloper.code,
            gamesCount: parseInt(favoriteDeveloper.gamesCount),
          }
        : undefined,
    };
  }

  async updateUser(
    userId: number,
    updateData: UpdateUserDto,
  ): Promise<{ id: number; name: string; nik: string; avatarPath: string }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Verificar si el nik ya existe si se está actualizando
    if (updateData.nik) {
      const existingUser = await this.usersRepository.findOne({
        where: { nik: updateData.nik },
      });
      if (existingUser && existingUser.id !== userId) {
        throw new UnauthorizedException('El nik ya está en uso');
      }
    }

    // Actualizar solo los campos proporcionados
    if (updateData.name) user.name = updateData.name;
    if (updateData.nik) user.nik = updateData.nik;

    await this.usersRepository.save(user);

    return {
      id: user.id,
      name: user.name,
      nik: user.nik,
      avatarPath: user.avatarPath,
    };
  }

  async updateAvatar(
    userId: number,
    file: Express.Multer.File,
  ): Promise<{ id: number; avatarPath: string }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Si existe un avatar previo, lo eliminamos
    if (user.avatarPath) {
      try {
        await unlink(join(process.cwd(), user.avatarPath));
      } catch (error) {
        console.log('Previous avatar file not found');
      }
    }

    // Actualizamos la ruta del nuevo avatar
    user.avatarPath = file.path;
    await this.usersRepository.save(user);

    return {
      id: user.id,
      avatarPath: user.avatarPath,
    };
  }

  async getYearlyStats(userId: number): Promise<YearlyStats> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const userGames = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userGames', 'userGame')
      .leftJoinAndSelect('userGame.game', 'game')
      .leftJoinAndSelect('game.images', 'image', 'game.coverId = image.id')
      .where('user.id = :userId', { userId })
      .andWhere('userGame.addedAt >= :oneYearAgo', { oneYearAgo })
      .orderBy('userGame.addedAt', 'DESC')
      .getOne();

    // Crear un objeto para almacenar los datos por mes
    const monthlyData = new Map<
      string,
      {
        owned: { count: number; games: any[] };
        wished: { count: number; games: any[] };
      }
    >();

    // Inicializar los últimos 12 meses
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().substring(0, 7); // Formato: "YYYY-MM"
      monthlyData.set(monthKey, {
        owned: { count: 0, games: [] },
        wished: { count: 0, games: [] },
      });
    }

    // Procesar los juegos del usuario
    userGames?.userGames.forEach((ug) => {
      const monthKey = ug.addedAt.toISOString().substring(0, 7);
      const monthData = monthlyData.get(monthKey);

      if (monthData) {
        const gameData = {
          id: ug.game.id,
          title: ug.game.title,
          addedAt: ug.addedAt,
          coverImage: ug.game.images?.[0]
            ? {
                id: ug.game.images[0].id,
                path: ug.game.images[0].path,
              }
            : undefined,
        };

        if (ug.owned) {
          monthData.owned.count++;
          monthData.owned.games.push(gameData);
        }
        if (ug.wished) {
          monthData.wished.count++;
          monthData.wished.games.push(gameData);
        }
      }
    });

    // Convertir el Map a un array ordenado por mes
    const months = Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        owned: data.owned,
        wished: data.wished,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return { months };
  }

  async sendFriendRequest(
    senderId: number,
    receiverNik: string,
    message?: string,
  ): Promise<void> {
    const receiver = await this.usersRepository.findOne({
      where: { nik: receiverNik },
    });
    if (!receiver) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const existingFriendship = await this.friendshipsRepository.findOne({
      where: [
        { sender: { id: senderId }, receiver: { id: receiver.id } },
        { sender: { id: receiver.id }, receiver: { id: senderId } },
      ],
    });

    if (existingFriendship) {
      throw new UnauthorizedException('Ya existe una solicitud de amistad');
    }

    const friendship = this.friendshipsRepository.create({
      sender: { id: senderId },
      receiver: { id: receiver.id },
      status: FriendshipStatus.PENDING,
      message: message,
    });

    await this.friendshipsRepository.save(friendship);
  }

  async respondToFriendRequest(
    userId: number,
    requestId: number,
    accept: boolean,
  ): Promise<void> {
    const friendship = await this.friendshipsRepository.findOne({
      where: {
        id: requestId,
        receiver: { id: userId },
        status: FriendshipStatus.PENDING,
      },
    });

    if (!friendship) {
      throw new UnauthorizedException('Solicitud no encontrada');
    }

    friendship.status = accept
      ? FriendshipStatus.ACCEPTED
      : FriendshipStatus.REJECTED;
    await this.friendshipsRepository.save(friendship);
  }

  async getFriendRequests(userId: number): Promise<FriendRequest[]> {
    const requests = await this.friendshipsRepository.find({
      where: {
        receiver: { id: userId },
        status: FriendshipStatus.PENDING,
      },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
    });

    return requests.map((request) => ({
      id: request.id,
      sender: {
        id: request.sender.id,
        name: request.sender.name,
        nik: request.sender.nik,
        avatarPath: request.sender.avatarPath,
      },
      message: request.message,
      createdAt: request.createdAt,
    }));
  }

  async getFriends(userId: number): Promise<
    {
      id: number;
      name: string;
      nik: string;
      avatarPath?: string;
    }[]
  > {
    const friendships = await this.friendshipsRepository.find({
      where: [
        { sender: { id: userId }, status: FriendshipStatus.ACCEPTED },
        { receiver: { id: userId }, status: FriendshipStatus.ACCEPTED },
      ],
      relations: ['sender', 'receiver'],
    });

    return friendships.map((friendship) => {
      const friend =
        friendship.sender.id === userId
          ? friendship.receiver
          : friendship.sender;
      return {
        id: friend.id,
        name: friend.name,
        nik: friend.nik,
        avatarPath: friend.avatarPath,
      };
    });
  }

  async removeFriend(userId: number, friendId: number): Promise<void> {
    const friendship = await this.friendshipsRepository.findOne({
      where: [
        {
          sender: { id: userId },
          receiver: { id: friendId },
          status: FriendshipStatus.ACCEPTED,
        },
        {
          sender: { id: friendId },
          receiver: { id: userId },
          status: FriendshipStatus.ACCEPTED,
        },
      ],
    });

    if (!friendship) {
      throw new UnauthorizedException('Amistad no encontrada');
    }

    await this.friendshipsRepository.remove(friendship);
  }

  async getFriendDetail(
    userId: number,
    friendId: number,
  ): Promise<FriendDetail> {
    const friendship = await this.friendshipsRepository
      .createQueryBuilder('friendship')
      .where([
        {
          sender: { id: userId },
          receiver: { id: friendId },
          status: FriendshipStatus.ACCEPTED,
        },
        {
          sender: { id: friendId },
          receiver: { id: userId },
          status: FriendshipStatus.ACCEPTED,
        },
      ])
      .select(['friendship.createdAt'])
      .getOne();

    if (!friendship) {
      throw new UnauthorizedException('No eres amigo de este usuario');
    }

    // Obtener información básica del amigo
    const friend = await this.usersRepository.findOne({
      where: { id: friendId },
      select: ['id', 'nik', 'avatarPath'],
    });

    if (!friend) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Obtener stats
    const profileStats = await this.getProfileStats(friendId);
    const yearlyStats = await this.getYearlyStats(friendId);

    return {
      id: friend.id,
      nik: friend.nik,
      avatarPath: friend.avatarPath,
      friendsSince: friendship.createdAt,
      profileStats,
      yearlyStats,
    };
  }
}
