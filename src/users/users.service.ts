import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService
  ) {}

  async create(user: Partial<User>): Promise<User> {
    if (user.password) {
      const salt = await bcrypt.genSalt();
      user.password = await bcrypt.hash(user.password, salt);
    }
    const newUser = this.usersRepository.create(user);
    return this.usersRepository.save(newUser);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOneByEmail(email: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async getUserInfoFromToken(token: string): Promise<{ id: number; name: string }> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.usersRepository.findOne({ where: { email: payload.email } });
      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }
      return { id: user.id, name: user.name };
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }
  }

  async updateUserName(userId: number, newName: string): Promise<{ id: number; name: string }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    user.name = newName;
    await this.usersRepository.save(user);
    return { id: user.id, name: user.name };
  }
}