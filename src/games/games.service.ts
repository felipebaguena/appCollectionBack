import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './game.entity';
import { Image } from '../images/image.entity';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
    @InjectRepository(Image)
    private imagesRepository: Repository<Image>,
  ) {}

  create(game: Partial<Game>): Promise<Game> {
    const newGame = this.gamesRepository.create(game);
    return this.gamesRepository.save(newGame);
  }

  findAll(): Promise<Game[]> {
    return this.gamesRepository.find();
  }

  findOne(id: number): Promise<Game> {
    return this.gamesRepository.findOne({ where: { id } });
  }

  async update(id: number, game: Partial<Game>): Promise<Game> {
    await this.gamesRepository.update(id, game);
    return this.gamesRepository.findOne({ where: { id } });
  }

  async remove(id: number): Promise<void> {
    await this.gamesRepository.delete(id);
  }

  async findOneWithImages(id: number): Promise<Game & { cover: Image, gallery: Image[] }> {
    const game = await this.gamesRepository.findOne({
      where: { id },
      relations: ['images'],
    });

    if (!game) {
      throw new Error('Juego no encontrado');
    }

    const cover = game.images.find(image => image.isCover) || null;
    const gallery = game.images.filter(image => !image.isCover);

    return {
      ...game,
      cover,
      gallery,
    };
  }

  async setCover(gameId: number, imageId: number): Promise<Game> {
    const game = await this.gamesRepository.findOne({ where: { id: gameId }, relations: ['images'] });
    if (!game) {
      throw new Error('Juego no encontrado');
    }

    const image = await this.imagesRepository.findOne({ where: { id: imageId } });
    if (!image) {
      throw new Error('Imagen no encontrada');
    }

    // Resetear isCover para todas las imágenes del juego
    await this.imagesRepository.update({ game: { id: gameId } }, { isCover: false });

    // Establecer la nueva imagen de portada
    image.isCover = true;
    await this.imagesRepository.save(image);

    // Actualizar el coverId en el juego
    game.coverId = imageId;
    return this.gamesRepository.save(game);
  }

  async findAllWithImages(): Promise<(Game & { cover: Image, gallery: Image[] })[]> {
    const games = await this.gamesRepository.find({
      relations: ['images'],
    });

    return games.map(game => {
      const cover = game.images.find(image => image.isCover) || null;
      const gallery = game.images.filter(image => !image.isCover);

      return {
        ...game,
        cover,
        gallery,
      };
    });
  }
}