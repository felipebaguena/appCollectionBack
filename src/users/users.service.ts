import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RolesService } from '../roles/roles.service';
import { ProfileStats } from './interfaces/profile-stats.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private rolesService: RolesService,
  ) {}

  async create(user: Partial<User>): Promise<User> {
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
      select: ['id', 'name', 'email', 'password', 'role'],
    });
  }

  async getUserInfoFromToken(
    token: string,
  ): Promise<{ id: number; name: string }> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.usersRepository.findOne({
        where: { email: payload.email },
      });
      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }
      return { id: user.id, name: user.name };
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }
  }

  async updateUserName(
    userId: number,
    newName: string,
  ): Promise<{ id: number; name: string }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    user.name = newName;
    await this.usersRepository.save(user);
    return { id: user.id, name: user.name };
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
    };
  }
}
