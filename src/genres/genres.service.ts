import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Genre } from './genre.entity';

@Injectable()
export class GenresService {
  private readonly logger = new Logger(GenresService.name);

  constructor(
    @InjectRepository(Genre)
    private genresRepository: Repository<Genre>,
  ) {}

  async create(genre: Partial<Genre>): Promise<Genre> {
    if (genre.code) {
      const existingGenre = await this.genresRepository.findOne({
        where: { code: genre.code },
      });
      if (existingGenre) {
        throw new ConflictException(
          `Genre with code ${genre.code} already exists`,
        );
      }
    }
    const newGenre = this.genresRepository.create(genre);
    return this.genresRepository.save(newGenre);
  }

  findAll(): Promise<Genre[]> {
    return this.genresRepository.find();
  }

  async findOne(id: number): Promise<Genre> {
    const genre = await this.genresRepository.findOne({ where: { id } });
    if (!genre) {
      throw new NotFoundException(`Genre with ID ${id} not found`);
    }
    return genre;
  }

  async update(id: number, genre: Partial<Genre>): Promise<Genre> {
    if (genre.code) {
      const existingGenre = await this.genresRepository.findOne({
        where: { code: genre.code, id: Not(id) },
      });
      if (existingGenre) {
        throw new ConflictException(
          `Genre with code ${genre.code} already exists`,
        );
      }
    }
    await this.genresRepository.update(id, genre);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.genresRepository.delete(id);
  }

  async findByCode(code: string): Promise<Genre> {
    const genre = await this.genresRepository.findOne({ where: { code } });
    if (!genre) {
      throw new NotFoundException(`Genre with code ${code} not found`);
    }
    return genre;
  }
}
