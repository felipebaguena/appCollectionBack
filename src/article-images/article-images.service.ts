import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
import { ArticleImage } from './article-image.entity';
import { Article } from '../articles/article.entity';
import { Game } from '../games/game.entity';

@Injectable()
export class ArticleImagesService {
  constructor(
    @InjectRepository(ArticleImage)
    private articleImageRepository: Repository<ArticleImage>,
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
  ) {}

  async create(imageData: Partial<ArticleImage>): Promise<ArticleImage> {
    const image = this.articleImageRepository.create(imageData);
    return this.articleImageRepository.save(image);
  }

  async findByArticle(articleId: number): Promise<ArticleImage[]> {
    return this.articleImageRepository.find({
      where: { articleId },
      relations: ['game'],
    });
  }

  async findByGame(gameId: number): Promise<ArticleImage[]> {
    return this.articleImageRepository.find({
      where: { gameId },
      relations: ['article'],
    });
  }

  async setCover(articleId: number, imageId: number): Promise<void> {
    // Primero obtenemos el artículo para saber a qué juego(s) está asociado
    const article = await this.articleRepository.findOne({
      where: { id: articleId },
      relations: ['relatedGames'],
    });

    if (!article) {
      throw new NotFoundException(`Article with ID ${articleId} not found`);
    }

    // Obtenemos los IDs de los juegos relacionados
    const gameIds = article.relatedGames.map((game) => game.id);

    // Verificar que la imagen existe y pertenece a alguno de los juegos relacionados
    const image = await this.articleImageRepository.findOne({
      where: {
        id: imageId,
        gameId: In(gameIds),
      },
    });

    if (!image) {
      throw new NotFoundException(
        `Image not found or doesn't belong to any of the related games`,
      );
    }

    // Actualiza SOLO el coverImageId del artículo específico
    await this.articleRepository.update(
      { id: articleId },
      { coverImageId: imageId },
    );
  }

  async remove(id: number): Promise<void> {
    await this.articleImageRepository.delete(id);
  }

  async findOne(id: number): Promise<ArticleImage> {
    const image = await this.articleImageRepository.findOne({
      where: { id },
      relations: ['article', 'game'],
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    return image;
  }

  async createGameImage(
    imageData: Partial<ArticleImage>,
  ): Promise<ArticleImage> {
    // Verificar que el juego existe
    const gameExists = await this.gameRepository.findOne({
      where: { id: imageData.gameId },
    });

    if (!gameExists) {
      throw new NotFoundException(`Game with ID ${imageData.gameId} not found`);
    }

    const image = this.articleImageRepository.create({
      ...imageData,
      articleId: null, // Explícitamente establecemos articleId como null
    });

    return this.articleImageRepository.save(image);
  }
}
