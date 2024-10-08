import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Image } from './image.entity';

@Injectable()
export class ImagesService {
  constructor(
    @InjectRepository(Image)
    private imagesRepository: Repository<Image>,
  ) {}

  async create(imageData: Partial<Image>): Promise<Image> {
    const image = this.imagesRepository.create(imageData);
    return this.imagesRepository.save(image);
  }

  async findAll(): Promise<Image[]> {
    return this.imagesRepository.find();
  }

  async findOne(id: number): Promise<Image> {
    return this.imagesRepository.findOne({ where: { id } });
  }

  async update(id: number, imageData: Partial<Image>): Promise<Image> {
    await this.imagesRepository.update(id, imageData);
    return this.imagesRepository.findOne({ where: { id } });
  }

  async remove(id: number): Promise<void> {
    await this.imagesRepository.delete(id);
  }

  async setCover(gameId: number, imageId: number): Promise<void> {
    await this.imagesRepository.update({ game: { id: gameId } }, { isCover: false });
    await this.imagesRepository.update(imageId, { isCover: true });
  }
}
