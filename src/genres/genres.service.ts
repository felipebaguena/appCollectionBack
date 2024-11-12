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
    return this.genresRepository
      .createQueryBuilder('genre')
      .orderBy('genre.name', 'ASC')
      .getMany();
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

  async getGenresForDataTable(options: {
    dataTable: {
      page: number;
      limit: number;
      sortField?: string;
      sortOrder?: 'ASC' | 'DESC';
    };
    filter?: {
      search?: string;
    };
  }): Promise<{ data: Genre[]; totalItems: number; totalPages: number }> {
    const { dataTable, filter } = options;
    const { page, limit, sortField, sortOrder } = dataTable;
    const skip = (page - 1) * limit;

    const queryBuilder = this.genresRepository
      .createQueryBuilder('genre')
      .select(['genre.id', 'genre.name', 'genre.code']);

    if (filter?.search) {
      queryBuilder.andWhere('genre.name LIKE :search', {
        search: `%${filter.search}%`,
      });
    }

    if (sortField && sortOrder) {
      queryBuilder.orderBy(`genre.${sortField}`, sortOrder);
    }

    const [genres, totalItems] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit);

    return { data: genres, totalItems, totalPages };
  }

  async getGenresForMultiselect(search?: string): Promise<
    {
      id: number;
      name: string;
      code: string;
    }[]
  > {
    const queryBuilder = this.genresRepository
      .createQueryBuilder('genre')
      .select(['genre.id', 'genre.name', 'genre.code']);

    if (search && search.trim() !== '') {
      queryBuilder.where('genre.name LIKE :search', {
        search: `%${search.trim()}%`,
      });
    }

    queryBuilder.orderBy('genre.name', 'ASC');

    return queryBuilder.getMany();
  }
}
