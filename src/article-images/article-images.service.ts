import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    // Verifica que la imagen existe y pertenece al artículo
    const image = await this.articleImageRepository.findOne({
      where: { id: imageId, articleId },
    });

    if (!image) {
      throw new NotFoundException(
        `Image not found or doesn't belong to this article`,
      );
    }

    // Resetea la portada actual si existe
    await this.articleImageRepository.update({ articleId }, { isCover: false });

    // Establece la nueva portada en la imagen
    await this.articleImageRepository.update(
      { id: imageId },
      { isCover: true },
    );

    // Actualiza el coverImageId en el artículo
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
