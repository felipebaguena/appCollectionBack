import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  async findOrCreate(name: string): Promise<Role> {
    let role = await this.rolesRepository.findOne({ where: { name } });
    if (!role) {
      role = this.rolesRepository.create({ name });
      await this.rolesRepository.save(role);
    }
    return role;
  }

  async findByName(name: string): Promise<Role> {
    return this.rolesRepository.findOne({ where: { name } });
  }
}
