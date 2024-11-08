import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArticleTemplate } from './article-template.entity';

@Injectable()
export class ArticleTemplatesService {
  constructor(
    @InjectRepository(ArticleTemplate)
    private templateRepository: Repository<ArticleTemplate>,
  ) {}

  async create(
    templateData: Partial<ArticleTemplate>,
  ): Promise<ArticleTemplate> {
    const template = this.templateRepository.create(templateData);
    return this.templateRepository.save(template);
  }

  async findAll(): Promise<ArticleTemplate[]> {
    return this.templateRepository.find();
  }

  async findActive(): Promise<ArticleTemplate[]> {
    return this.templateRepository.find({ where: { isActive: true } });
  }

  async findOne(id: number): Promise<ArticleTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['articles'],
    });
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return template;
  }

  async update(
    id: number,
    templateData: Partial<ArticleTemplate>,
  ): Promise<ArticleTemplate> {
    await this.templateRepository.update(id, templateData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const template = await this.findOne(id);
    await this.templateRepository.remove(template);
  }
}
