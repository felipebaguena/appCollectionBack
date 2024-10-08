import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Image } from './image.entity';
import { Game } from '../games/game.entity';

@Injectable()
export class ImagesService {
  constructor(
    @InjectRepository(Image)
    private imagesRepository: Repository<Image>,
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>
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
    // Primero, resetea isCover para todas las imágenes del juego
    await this.imagesRepository.update(
      { game: { id: gameId } },
      { isCover: false }
    );

    // Luego, establece la nueva imagen de portada
    await this.imagesRepository.update(
      { id: imageId },
      { isCover: true }
    );

    // Finalmente, actualiza el coverId en el juego
    await this.gamesRepository.update(
      { id: gameId },
      { coverId: imageId }
    );
  }

  async findByGameId(gameId: number): Promise<Image[]> {
    return this.imagesRepository.find({
      where: { game: { id: gameId } },
      relations: ['game'],
    });
  }
}
