import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './game.entity';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
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
    return this.gamesRepository.findOne({
      where: { id },
      relations: ['images'],
    });
  }

  async setCover(gameId: number, imageId: number): Promise<Game> {
    const game = await this.gamesRepository.findOne({ where: { id: gameId } });
    game.coverId = imageId;
    return this.gamesRepository.save(game);
  }
}