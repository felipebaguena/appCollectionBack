import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Platform } from './platform.entity';

@Injectable()
export class PlatformsService {
  private readonly logger = new Logger(PlatformsService.name);

  constructor(
    @InjectRepository(Platform)
    private platformsRepository: Repository<Platform>,
  ) {}

  create(platform: Partial<Platform>): Promise<Platform> {
    const newPlatform = this.platformsRepository.create(platform);
    return this.platformsRepository.save(newPlatform);
  }

  findAll(): Promise<Platform[]> {
    return this.platformsRepository.find();
  }

  async findOne(id: number): Promise<Platform> {
    const platform = await this.platformsRepository.findOne({ where: { id } });
    if (!platform) {
      throw new NotFoundException(`Platform with ID ${id} not found`);
    }
    return platform;
  }

  async update(id: number, platform: Partial<Platform>): Promise<Platform> {
    await this.platformsRepository.update(id, platform);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.platformsRepository.delete(id);
  }

  async getPlatformsForDataTable(options: {
    dataTable: {
      page: number;
      limit: number;
      sortField?: string;
      sortOrder?: 'ASC' | 'DESC';
    };
    filter?: {
      search?: string;
    };
  }): Promise<{ data: Platform[]; totalItems: number; totalPages: number }> {
    const { dataTable, filter } = options;
    const { page, limit, sortField, sortOrder } = dataTable;
    const skip = (page - 1) * limit;

    const queryBuilder = this.platformsRepository
      .createQueryBuilder('platform')
      .select(['platform.id', 'platform.name', 'platform.code']);

    if (filter?.search) {
      queryBuilder.andWhere('platform.name LIKE :search', {
        search: `%${filter.search}%`,
      });
    }

    if (sortField && sortOrder) {
      queryBuilder.orderBy(`platform.${sortField}`, sortOrder);
    }

    const [platforms, totalItems] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit);

    return { data: platforms, totalItems, totalPages };
  }
}
