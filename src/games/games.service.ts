import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './game.entity';
import { Image } from '../images/image.entity';

@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);

  constructor(
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
    @InjectRepository(Image)
    private imagesRepository: Repository<Image>
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

  async findOneWithImages(id: number): Promise<Game> {
    const game = await this.gamesRepository.findOne({
      where: { id },
      relations: ['images'],
    });

    if (!game) {
      throw new Error('Juego no encontrado');
    }

    return game;
  }

  async setCover(gameId: number, imageId: number): Promise<Game> {
    const game = await this.gamesRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new Error('Juego no encontrado');
    }

    const image = await this.imagesRepository.findOne({ where: { id: imageId, game: { id: gameId } } });
    if (!image) {
      throw new Error('Imagen no encontrada para este juego');
    }

    game.coverId = imageId;
    return this.gamesRepository.save(game);
  }

  async findAllWithImages(): Promise<Game[]> {
    return this.gamesRepository.find({
      relations: ['images'],
    });
  }

  async getHomeGames(limit: number = 9): Promise<Game[]> {
    const games = await this.gamesRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.images', 'image')
      .orderBy('RAND()')
      .take(limit)
      .getMany();

    return games;
  }
}