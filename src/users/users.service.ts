import {
  Injectable,
  UnauthorizedException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, LessThan } from 'typeorm';
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
import { Message } from './message.entity';
import { MessageDto } from './interfaces/message.interface';
import { ConversationPreview } from './interfaces/conversation-preview.interface';
import { UserBasic } from './interfaces/user-basic.interface';
import { Logger } from '@nestjs/common';
import { Comment } from 'src/articles/comment.entity';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Friendship)
    private friendshipsRepository: Repository<Friendship>,
    private jwtService: JwtService,
    private rolesService: RolesService,
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
  ) {}

  onApplicationBootstrap() {
    setInterval(() => {
      this.checkOnlineStatus();
    }, 30000); // Revisar cada 30 segundos
  }

  private async checkOnlineStatus() {
    const offlineThreshold = new Date(Date.now() - 60000); // 60 segundos

    try {
      await this.usersRepository
        .createQueryBuilder()
        .update(User)
        .set({ isOnline: false })
        .where('lastSeen < :threshold', { threshold: offlineThreshold })
        .andWhere('isOnline = :isOnline', { isOnline: true })
        .execute();

      this.logger.debug('Estado online de usuarios actualizado');
    } catch (error) {
      this.logger.error(
        'Error al actualizar estado online de usuarios:',
        error,
      );
    }
  }

  async create(
    user: Partial<User>,
  ): Promise<{ user: User; access_token: string }> {
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

    const savedUser = await this.usersRepository.save(newUser);

    // Generar token
    const payload = {
      email: savedUser.email,
      sub: savedUser.id,
      role: defaultRole.name,
    };

    return {
      user: savedUser,
      access_token: this.jwtService.sign(payload),
    };
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOneByEmail(email: string): Promise<User | undefined> {
    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['role'],
      select: [
        'id',
        'name',
        'nik',
        'email',
        'password',
        'role',
        'avatarPath',
        'isOnline',
        'lastSeen',
      ],
    });

    // Actualizar estado online y última conexión si el usuario existe
    if (user) {
      user.isOnline = true;
      user.lastSeen = new Date();
      await this.usersRepository.save(user);
    }

    return user;
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
        'COUNT(userGame.id) as totalGames',
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
      isOnline: boolean;
      lastSeen: Date;
    }[]
  > {
    const friendships = await this.friendshipsRepository.find({
      where: [
        { sender: { id: userId }, status: FriendshipStatus.ACCEPTED },
        { receiver: { id: userId }, status: FriendshipStatus.ACCEPTED },
      ],
      relations: ['sender', 'receiver'],
    });

    const friends = friendships.map((friendship) => {
      const friend =
        friendship.sender.id === userId
          ? friendship.receiver
          : friendship.sender;
      return {
        id: friend.id,
        name: friend.name,
        nik: friend.nik,
        avatarPath: friend.avatarPath,
        isOnline: friend.isOnline,
        lastSeen: friend.lastSeen || new Date(0),
      };
    });

    // Ordenar: primero los online, luego por última conexión
    return friends.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      const aTime = a.lastSeen?.getTime() || 0;
      const bTime = b.lastSeen?.getTime() || 0;
      return bTime - aTime;
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
      select: ['id', 'nik', 'avatarPath', 'isOnline', 'lastSeen'],
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
      isOnline: friend.isOnline,
      lastSeen: friend.lastSeen,
      friendsSince: friendship.createdAt,
      profileStats,
      yearlyStats,
    };
  }

  async sendMessage(
    senderId: number,
    receiverId: number,
    content: string,
  ): Promise<MessageDto> {
    const friendship = await this.friendshipsRepository.findOne({
      where: [
        {
          sender: { id: senderId },
          receiver: { id: receiverId },
          status: FriendshipStatus.ACCEPTED,
        },
        {
          sender: { id: receiverId },
          receiver: { id: senderId },
          status: FriendshipStatus.ACCEPTED,
        },
      ],
    });

    if (!friendship) {
      throw new UnauthorizedException(
        'Solo puedes enviar mensajes a tus amigos',
      );
    }

    const message = this.messagesRepository.create({
      sender: { id: senderId },
      receiver: { id: receiverId },
      content,
    });

    const savedMessage = await this.messagesRepository.save(message);
    return this.formatMessage(savedMessage);
  }

  async getConversation(
    userId: number,
    friendId: number,
  ): Promise<MessageDto[]> {
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
      throw new UnauthorizedException('Solo puedes ver mensajes de tus amigos');
    }

    const messages = await this.messagesRepository.find({
      where: [
        { sender: { id: userId }, receiver: { id: friendId } },
        { sender: { id: friendId }, receiver: { id: userId } },
      ],
      relations: ['sender', 'receiver'],
      order: { createdAt: 'DESC' },
      take: 50, // Limitar a los últimos 50 mensajes
    });

    // Marcar como leídos los mensajes recibidos
    const unreadMessages = messages.filter(
      (msg) => msg.receiver.id === userId && !msg.read,
    );
    if (unreadMessages.length > 0) {
      await this.messagesRepository.update(
        unreadMessages.map((msg) => msg.id),
        { read: true },
      );
    }

    return messages.map((msg) => this.formatMessage(msg));
  }

  async getUnreadMessagesCount(
    userId: number,
  ): Promise<{ unreadChats: number; unreadComments: boolean }> {
    // Actualizar estado online y última conexión
    await this.usersRepository.update(
      { id: userId },
      {
        isOnline: true,
        lastSeen: new Date(),
      },
    );

    // Obtener mensajes no leídos
    const unreadChatsCount = await this.messagesRepository.count({
      where: {
        receiver: { id: userId },
        read: false,
      },
    });

    // Obtener comentarios no leídos (respuestas a tus comentarios)
    const hasUnreadComments =
      (await this.commentRepository
        .createQueryBuilder('comment')
        .innerJoin('comment.parent', 'parentComment')
        .where('parentComment.userId = :userId', { userId })
        .andWhere('comment.read = :read', { read: false })
        .getCount()) > 0;

    return {
      unreadChats: unreadChatsCount,
      unreadComments: hasUnreadComments,
    };
  }

  private formatMessage(message: Message): MessageDto {
    return {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      read: message.read,
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        nik: message.sender.nik,
        avatarPath: message.sender.avatarPath,
      },
      receiver: {
        id: message.receiver.id,
        name: message.receiver.name,
        nik: message.receiver.nik,
        avatarPath: message.receiver.avatarPath,
      },
    };
  }

  async getConversations(userId: number): Promise<ConversationPreview[]> {
    // Obtener todas las conversaciones donde el usuario es sender o receiver
    const conversations = await this.messagesRepository
      .createQueryBuilder('message')
      .select(
        'CASE WHEN message.senderId = :userId THEN message.receiverId ELSE message.senderId END',
        'friendId',
      )
      .addSelect('MAX(message.id)', 'lastMessageId')
      .addSelect(
        'COUNT(CASE WHEN message.receiverId = :userId AND message.read = false THEN 1 END)',
        'unreadCount',
      )
      .where('message.senderId = :userId OR message.receiverId = :userId')
      .groupBy('friendId')
      .setParameter('userId', userId)
      .getRawMany();

    const conversationPreviews: ConversationPreview[] = [];

    for (const conv of conversations) {
      const friend = await this.usersRepository.findOne({
        where: { id: conv.friendId },
        select: ['id', 'name', 'nik', 'avatarPath', 'isOnline', 'lastSeen'],
      });

      const lastMessage = await this.messagesRepository.findOne({
        where: { id: conv.lastMessageId },
        relations: ['sender', 'receiver'],
      });

      if (friend && lastMessage) {
        conversationPreviews.push({
          friend: {
            id: friend.id,
            name: friend.name,
            nik: friend.nik,
            avatarPath: friend.avatarPath,
            isOnline: friend.isOnline,
            lastSeen: friend.lastSeen,
          },
          lastMessage: {
            id: lastMessage.id,
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            read: lastMessage.read,
            isFromMe: lastMessage.sender.id === userId,
          },
          unreadCount: parseInt(conv.unreadCount) || 0,
        });
      }
    }

    // Modificar el orden: primero por estado online, luego por último mensaje
    return conversationPreviews.sort((a, b) => {
      if (a.friend.isOnline && !b.friend.isOnline) return -1;
      if (!a.friend.isOnline && b.friend.isOnline) return 1;
      const aTime = a.friend.lastSeen?.getTime() || 0;
      const bTime = b.friend.lastSeen?.getTime() || 0;
      return bTime - aTime;
    });
  }

  async readBasic(userId: number, nikFilter?: string): Promise<UserBasic[]> {
    // Actualizar estado offline de forma más precisa
    await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({ isOnline: false })
      .where('lastSeen < :threshold', {
        threshold: new Date(Date.now() - 60000),
      })
      .andWhere('isOnline = :isOnline', { isOnline: true })
      .execute();

    // Obtener todas las amistades (aceptadas y pendientes)
    const friendships = await this.friendshipsRepository.find({
      where: [{ sender: { id: userId } }, { receiver: { id: userId } }],
      relations: ['sender', 'receiver'],
    });

    // Crear Sets para búsqueda eficiente
    const friendIds = new Set(
      friendships
        .filter((f) => f.status === FriendshipStatus.ACCEPTED)
        .map((f) => (f.sender.id === userId ? f.receiver.id : f.sender.id)),
    );

    const pendingRequestIds = new Set(
      friendships
        .filter((f) => f.status === FriendshipStatus.PENDING)
        .map((f) => (f.sender.id === userId ? f.receiver.id : f.sender.id)),
    );

    // Luego creamos el query builder
    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.nik',
        'user.avatarPath',
        'user.isOnline',
        'user.lastSeen',
      ])
      .where('user.id != :userId', { userId });

    // Añadir filtro por nik si existe
    if (nikFilter) {
      queryBuilder.andWhere('LOWER(user.nik) LIKE LOWER(:nikFilter)', {
        nikFilter: `%${nikFilter}%`,
      });
    }

    const users = await queryBuilder.getMany();

    // Mapear y ordenar resultados
    const mappedUsers = users.map((user) => ({
      id: user.id,
      nik: user.nik,
      avatarPath: user.avatarPath,
      isFriend: friendIds.has(user.id),
      hasPendingFriendRequest: pendingRequestIds.has(user.id),
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
    }));

    // Ordenar: primero los online, luego por última conexión
    return mappedUsers.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      const aTime = a.lastSeen?.getTime() || 0;
      const bTime = b.lastSeen?.getTime() || 0;
      return bTime - aTime;
    });
  }

  async getCommentReplies(
    userId: number,
    page: number,
    limit: number,
  ): Promise<{
    article: { id: number; title: string };
    replies: {
      id: number;
      content: string;
      createdAt: Date;
      read: boolean;
      user: { id: number; name: string; nik: string; avatarPath: string };
    }[];
    totalItems: number;
    totalPages: number;
  }> {
    const [replies, totalItems] = await this.commentRepository
      .createQueryBuilder('comment')
      .innerJoin(
        'comment.parent',
        'parentComment',
        'parentComment.userId = :userId',
        { userId },
      )
      .leftJoinAndSelect('comment.user', 'user')
      .leftJoinAndSelect('comment.article', 'article')
      .orderBy('comment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    if (replies.length === 0) {
      return {
        article: null,
        replies: [],
        totalItems: 0,
        totalPages: 0,
      };
    }

    return {
      article: {
        id: replies[0].article.id,
        title: replies[0].article.title,
      },
      replies: replies.map((reply) => ({
        id: reply.id,
        content: reply.content,
        createdAt: reply.createdAt,
        read: reply.read,
        user: {
          id: reply.user.id,
          name: reply.user.name,
          nik: reply.user.nik,
          avatarPath: reply.user.avatarPath,
        },
      })),
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    };
  }
}
