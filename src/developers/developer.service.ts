import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Developer } from './developer.entity';

@Injectable()
export class DevelopersService {
  private readonly logger = new Logger(DevelopersService.name);

  constructor(
    @InjectRepository(Developer)
    private developersRepository: Repository<Developer>,
  ) {}

  async create(developer: Partial<Developer>): Promise<Developer> {
    if (developer.code) {
      const existingDeveloper = await this.developersRepository.findOne({
        where: { code: developer.code },
      });
      if (existingDeveloper) {
        throw new ConflictException(
          `Developer with code ${developer.code} already exists`,
        );
      }
    }
    const newDeveloper = this.developersRepository.create(developer);
    return this.developersRepository.save(newDeveloper);
  }

  findAll(): Promise<Developer[]> {
    return this.developersRepository.find();
  }

  async findOne(id: number): Promise<Developer> {
    const developer = await this.developersRepository.findOne({
      where: { id },
    });
    if (!developer) {
      throw new NotFoundException(`Developer with ID ${id} not found`);
    }
    return developer;
  }

  async findByCode(code: string): Promise<Developer> {
    const developer = await this.developersRepository.findOne({
      where: { code },
    });
    if (!developer) {
      throw new NotFoundException(`Developer with code ${code} not found`);
    }
    return developer;
  }

  async update(id: number, developer: Partial<Developer>): Promise<Developer> {
    if (developer.code) {
      const existingDeveloper = await this.developersRepository.findOne({
        where: { code: developer.code, id: Not(id) },
      });
      if (existingDeveloper) {
        throw new ConflictException(
          `Developer with code ${developer.code} already exists`,
        );
      }
    }
    await this.developersRepository.update(id, developer);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.developersRepository.delete(id);
  }
}
