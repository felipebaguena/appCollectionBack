import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
import { ArticleImage } from './article-image.entity';
import { Article } from '../articles/article.entity';
import { Game } from '../games/game.entity';
import { ArticleImageWithLegacyFields } from './interfaces/article-image.interface';

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

  async create(
    imageData: Partial<ArticleImageWithLegacyFields>,
  ): Promise<ArticleImageWithLegacyFields> {
    // Si hay un articleId, necesitamos obtener el artículo
    let article: Article | null = null;
    if (imageData.articleId) {
      article = await this.articleRepository.findOne({
        where: { id: imageData.articleId },
      });
      if (!article) {
        throw new NotFoundException(
          `Article with ID ${imageData.articleId} not found`,
        );
      }
    }

    // Creamos la imagen sin el articleId (ya que ahora es ManyToMany)
    const imageToCreate = {
      ...imageData,
      articleId: undefined, // Removemos articleId del objeto
    };

    const image = this.articleImageRepository.create(imageToCreate);
    const savedImage = await this.articleImageRepository.save(image);

    // Si tenemos un artículo, establecemos la relación
    if (article) {
      await this.articleImageRepository
        .createQueryBuilder()
        .relation(ArticleImage, 'articles')
        .of(savedImage)
        .add(article.id);
    }

    // Para mantener la compatibilidad con el frontend, añadimos el articleId al resultado
    return {
      ...savedImage,
      articleId: imageData.articleId,
    };
  }

  async findByArticle(
    articleId: number,
  ): Promise<ArticleImageWithLegacyFields[]> {
    const article = await this.articleRepository.findOne({
      where: { id: articleId },
      relations: ['images', 'images.game'],
    });

    if (!article) {
      throw new NotFoundException(`Article with ID ${articleId} not found`);
    }

    // Transformamos el resultado para mantener la misma estructura que espera el frontend
    return article.images.map((image) => ({
      ...image,
      articleId: articleId, // Añadimos explícitamente el articleId para mantener compatibilidad
    }));
  }

  async findByGame(gameId: number): Promise<ArticleImageWithLegacyFields[]> {
    const images = await this.articleImageRepository
      .createQueryBuilder('image')
      .leftJoinAndSelect('image.articles', 'article')
      .leftJoinAndSelect('image.game', 'game')
      .where('image.gameId = :gameId', { gameId })
      .getMany();

    // Transformamos el resultado para mantener la estructura anterior
    return images.map((image) => ({
      ...image,
      articleId: image.articles?.[0]?.id || null, // Tomamos el primer artículo si existe
      article: image.articles?.[0] || null, // Mantenemos la relación article singular
    }));
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
      relations: ['articles'],
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

  async findOne(id: number): Promise<ArticleImageWithLegacyFields> {
    const image = await this.articleImageRepository.findOne({
      where: { id },
      relations: ['articles', 'game'],
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    // Mantener la compatibilidad con el frontend
    return {
      ...image,
      articleId: image.articles?.[0]?.id || null,
      article: image.articles?.[0] || null,
    };
  }

  async createGameImage(
    imageData: Partial<ArticleImageWithLegacyFields>,
  ): Promise<ArticleImageWithLegacyFields> {
    // Verificar que el juego existe
    const gameExists = await this.gameRepository.findOne({
      where: { id: imageData.gameId },
    });

    if (!gameExists) {
      throw new NotFoundException(`Game with ID ${imageData.gameId} not found`);
    }

    // Creamos una versión limpia del objeto para TypeORM
    const imageToCreate = this.articleImageRepository.create({
      filename: imageData.filename,
      path: imageData.path,
      gameId: imageData.gameId,
      isActive: true,
      order: 0,
    });

    const savedImage = await this.articleImageRepository.save(imageToCreate);

    // Devolvemos el resultado con los campos legacy
    return {
      ...savedImage,
      articleId: null,
      article: null,
    } as ArticleImageWithLegacyFields;
  }
}
