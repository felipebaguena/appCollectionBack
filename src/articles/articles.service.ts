import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnApplicationBootstrap,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Raw } from 'typeorm';
import { Article } from './article.entity';
import { Game } from '../games/game.entity';
import { Platform } from '../platforms/platform.entity';
import { Developer } from '../developers/developer.entity';
import { Genre } from '../genres/genre.entity';
import { ArticleTemplate } from '../article-templates/article-template.entity';
import { PublishedStatus } from './articles.enum';
import { ArticleImage } from '../article-images/article-image.entity';
import {
  HomeArticlesResponse,
  ArticleCardResponse,
  ArticlesPageResponse,
} from './articles.interface';
import { Comment } from './comment.entity';
import { User } from '../users/user.entity';
import { CommentDto } from './interfaces/comment.interface';
import { Friendship, FriendshipStatus } from '../users/friendship.entity';

@Injectable()
export class ArticlesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ArticlesService.name);

  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(Platform)
    private platformRepository: Repository<Platform>,
    @InjectRepository(Developer)
    private developerRepository: Repository<Developer>,
    @InjectRepository(Genre)
    private genreRepository: Repository<Genre>,
    @InjectRepository(ArticleTemplate)
    private templateRepository: Repository<ArticleTemplate>,
    @InjectRepository(ArticleImage)
    private articleImageRepository: Repository<ArticleImage>,
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
  ) {}

  onApplicationBootstrap() {
    setInterval(() => {
      this.checkScheduledPublications();
    }, 60000);
  }

  private async checkScheduledPublications() {
    const now = new Date();

    const scheduledArticles = await this.articleRepository.find({
      where: {
        published: false,
        scheduledPublishAt: Raw((alias) => `${alias} <= :now`, { now }),
      },
    });

    for (const article of scheduledArticles) {
      try {
        article.published = true;
        article.publishedAt = now;
        article.scheduledPublishAt = null;
        await this.articleRepository.save(article);

        this.logger.log(`Artículo ${article.id} publicado automáticamente`);
      } catch (error) {
        this.logger.error(
          `Error al publicar el artículo ${article.id}:`,
          error,
        );
      }
    }
  }

  async schedulePublication(id: number, publishAt: Date): Promise<Article> {
    const article = await this.findOne(id);

    if (publishAt <= new Date()) {
      throw new BadRequestException('La fecha de publicación debe ser futura');
    }

    article.scheduledPublishAt = publishAt;
    article.published = false;
    article.publishedAt = null;

    return this.articleRepository.save(article);
  }

  async create(
    article: Partial<Article> & {
      relatedGames?: number[];
      relatedPlatforms?: number[];
      relatedDevelopers?: number[];
      relatedGenres?: number[];
      templateId?: number;
      coverImageId?: number;
      contentImageIds?: number[];
    },
  ): Promise<Article> {
    const {
      relatedGames = [],
      relatedPlatforms = [],
      relatedDevelopers = [],
      relatedGenres = [],
      templateId,
      coverImageId,
      contentImageIds = [],
      ...articleData
    } = article;

    let newArticle = this.articleRepository.create(articleData);

    // Verificar y asignar la plantilla
    if (templateId) {
      const template = await this.templateRepository.findOne({
        where: { id: templateId },
      });
      if (!template) {
        throw new NotFoundException('Plantilla no encontrada');
      }
      newArticle.template = template;

      // Verificar que el número de imágenes coincide con el requerido por la plantilla
      if (template.imageCount !== contentImageIds.length) {
        throw new BadRequestException(
          `La plantilla "${template.name}" requiere exactamente ${template.imageCount} imágenes de contenido`,
        );
      }
    }

    // Verificar y asignar juegos relacionados
    if (relatedGames.length) {
      const games = await this.gameRepository.findBy({
        id: In(relatedGames),
      });
      if (games.length !== relatedGames.length) {
        throw new NotFoundException('Uno o más juegos no encontrados');
      }
      newArticle.relatedGames = games;

      // Verificar que las imágenes pertenecen a los juegos relacionados
      if (coverImageId || contentImageIds.length > 0) {
        const allImageIds = [
          ...(coverImageId ? [coverImageId] : []),
          ...contentImageIds,
        ];
        const images = await this.articleImageRepository.find({
          where: {
            id: In(allImageIds),
            gameId: In(relatedGames),
          },
        });

        if (images.length !== allImageIds.length) {
          throw new BadRequestException(
            'Una o más imágenes no fueron encontradas o no pertenecen a los juegos relacionados',
          );
        }
      }
    }

    // Asignar imagen de portada
    if (coverImageId) {
      newArticle.coverImageId = coverImageId;
    }

    // Resto de las relaciones...
    if (relatedPlatforms.length) {
      const platforms = await this.platformRepository.findBy({
        id: In(relatedPlatforms),
      });
      if (platforms.length !== relatedPlatforms.length) {
        throw new NotFoundException('Una o más plataformas no encontradas');
      }
      newArticle.relatedPlatforms = platforms;
    }

    // Verificar y asignar desarrolladores relacionados
    if (relatedDevelopers.length) {
      const developers = await this.developerRepository.findBy({
        id: In(relatedDevelopers),
      });
      if (developers.length !== relatedDevelopers.length) {
        throw new NotFoundException('Uno o más desarrolladores no encontrados');
      }
      newArticle.relatedDevelopers = developers;
    }

    // Verificar y asignar géneros relacionados
    if (relatedGenres.length) {
      const genres = await this.genreRepository.findBy({
        id: In(relatedGenres),
      });
      if (genres.length !== relatedGenres.length) {
        throw new NotFoundException('Uno o más géneros no encontrados');
      }
      newArticle.relatedGenres = genres;
    }

    // Guardar el artículo
    newArticle = await this.articleRepository.save(newArticle);

    // Asignar las imágenes de contenido
    if (contentImageIds.length > 0) {
      // En lugar de update, ahora usamos la relación ManyToMany
      const images =
        await this.articleImageRepository.findByIds(contentImageIds);

      // Establecer el orden en la tabla de relación
      await Promise.all(
        images.map((image, index) =>
          this.articleImageRepository
            .createQueryBuilder()
            .relation(ArticleImage, 'articles')
            .of(image)
            .add(newArticle.id)
            .then(() => {
              // Actualizar el orden en una tabla separada o en metadatos
              return this.articleImageRepository.update(
                { id: image.id },
                { order: index + 1 },
              );
            }),
        ),
      );
    }

    return this.findOne(newArticle.id);
  }

  async findAll(): Promise<Article[]> {
    return this.articleRepository.find({
      relations: [
        'relatedGames',
        'relatedPlatforms',
        'relatedDevelopers',
        'relatedGenres',
        'template',
      ],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: number): Promise<Article> {
    const article = await this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.relatedGames', 'relatedGames')
      .leftJoinAndSelect('article.relatedPlatforms', 'relatedPlatforms')
      .leftJoinAndSelect('article.relatedDevelopers', 'relatedDevelopers')
      .leftJoinAndSelect('article.relatedGenres', 'relatedGenres')
      .leftJoinAndSelect('article.template', 'template')
      .leftJoinAndMapOne(
        'article.coverImage',
        ArticleImage,
        'coverImage',
        'coverImage.id = article.coverImageId',
      )
      .leftJoinAndSelect('article.images', 'images')
      .where('article.id = :id', { id })
      .orderBy('images.order', 'ASC')
      .getOne();

    if (!article) {
      throw new NotFoundException(`Artículo con ID ${id} no encontrado`);
    }

    // Transformar el resultado para mantener la estructura exacta que espera el frontend
    const transformedArticle = {
      ...article,
      coverImage: article['coverImage']
        ? {
            id: article['coverImage'].id,
            path: article['coverImage'].path,
          }
        : null,
      contentImages: (article['images'] || [])
        .filter((img) => img.id !== article.coverImageId)
        .sort((a, b) => a.order - b.order)
        .map((img) => ({
          id: img.id,
          path: img.path,
        })),
    };

    // Eliminar la propiedad 'images' ya que no la necesitamos en la respuesta
    delete (transformedArticle as any).images;

    return transformedArticle as Article;
  }

  async update(
    id: number,
    articleData: Partial<Article> & {
      relatedGames?: number[];
      relatedPlatforms?: number[];
      relatedDevelopers?: number[];
      relatedGenres?: number[];
      templateId?: number;
    },
  ): Promise<Article> {
    const article = await this.findOne(id);

    const {
      relatedGames,
      relatedPlatforms,
      relatedDevelopers,
      relatedGenres,
      templateId,
      ...otherData
    } = articleData;

    if (templateId) {
      const template = await this.templateRepository.findOne({
        where: { id: templateId },
      });
      if (!template) {
        throw new NotFoundException('Plantilla no encontrada');
      }
      article.template = template;
    }

    if (relatedGames) {
      const games = await this.gameRepository.findBy({
        id: In(relatedGames),
      });
      if (games.length !== relatedGames.length) {
        throw new NotFoundException('Uno o más juegos no encontrados');
      }
      article.relatedGames = games;
    }

    if (relatedPlatforms) {
      const platforms = await this.platformRepository.findBy({
        id: In(relatedPlatforms),
      });
      if (platforms.length !== relatedPlatforms.length) {
        throw new NotFoundException('Una o más plataformas no encontradas');
      }
      article.relatedPlatforms = platforms;
    }

    if (relatedDevelopers) {
      const developers = await this.developerRepository.findBy({
        id: In(relatedDevelopers),
      });
      if (developers.length !== relatedDevelopers.length) {
        throw new NotFoundException('Uno o más desarrolladores no encontrados');
      }
      article.relatedDevelopers = developers;
    }

    if (relatedGenres) {
      const genres = await this.genreRepository.findBy({
        id: In(relatedGenres),
      });
      if (genres.length !== relatedGenres.length) {
        throw new NotFoundException('Uno o más géneros no encontrados');
      }
      article.relatedGenres = genres;
    }

    Object.assign(article, otherData);
    return this.articleRepository.save(article);
  }

  async publish(id: number): Promise<Article> {
    const article = await this.findOne(id);
    article.published = true;
    article.publishedAt = new Date();
    return this.articleRepository.save(article);
  }

  async unpublish(id: number): Promise<Article> {
    const article = await this.findOne(id);
    article.published = false;
    article.publishedAt = null;
    return this.articleRepository.save(article);
  }

  async remove(id: number): Promise<void> {
    const article = await this.findOne(id);
    await this.articleRepository.remove(article);
  }

  async findPublished(): Promise<Article[]> {
    return this.articleRepository.find({
      where: { published: true },
      relations: [
        'relatedGames',
        'relatedPlatforms',
        'relatedDevelopers',
        'relatedGenres',
        'template',
      ],
      order: {
        publishedAt: 'DESC',
      },
    });
  }

  async findByGame(gameId: number): Promise<Article[]> {
    return this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.relatedGames', 'game')
      .leftJoinAndSelect('article.relatedPlatforms', 'platform')
      .leftJoinAndSelect('article.relatedDevelopers', 'developer')
      .leftJoinAndSelect('article.relatedGenres', 'genre')
      .where('game.id = :gameId', { gameId })
      .orderBy('article.createdAt', 'DESC')
      .getMany();
  }

  async findByPlatform(platformId: number): Promise<Article[]> {
    return this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.relatedGames', 'game')
      .leftJoinAndSelect('article.relatedPlatforms', 'platform')
      .leftJoinAndSelect('article.relatedDevelopers', 'developer')
      .leftJoinAndSelect('article.relatedGenres', 'genre')
      .where('platform.id = :platformId', { platformId })
      .andWhere('article.published = :published', { published: true })
      .orderBy('article.publishedAt', 'DESC')
      .getMany();
  }

  async findByGenre(genreId: number): Promise<Article[]> {
    return this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.relatedGames', 'game')
      .leftJoinAndSelect('article.relatedPlatforms', 'platform')
      .leftJoinAndSelect('article.relatedDevelopers', 'developer')
      .leftJoinAndSelect('article.relatedGenres', 'genre')
      .where('genre.id = :genreId', { genreId })
      .orderBy('article.createdAt', 'DESC')
      .getMany();
  }

  async findByDeveloper(developerId: number): Promise<Article[]> {
    return this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.relatedGames', 'game')
      .leftJoinAndSelect('article.relatedPlatforms', 'platform')
      .leftJoinAndSelect('article.relatedDevelopers', 'developer')
      .leftJoinAndSelect('article.relatedGenres', 'genre')
      .where('developer.id = :developerId', { developerId })
      .orderBy('article.createdAt', 'DESC')
      .getMany();
  }

  async getArticlesForDataTable(options: {
    dataTable: {
      page: number;
      limit: number;
      sortField?: string;
      sortOrder?: 'ASC' | 'DESC';
    };
    filter?: {
      search?: string;
      platformIds?: number[];
      genreIds?: number[];
      developerIds?: number[];
      gameIds?: number[];
      creationDateRange?: {
        start?: string;
        end?: string;
      } | null;
      publishedDateRange?: {
        start?: string;
        end?: string;
      } | null;
      publishedStatus?: PublishedStatus;
    };
  }): Promise<{ data: Article[]; totalItems: number; totalPages: number }> {
    const { dataTable, filter } = options;
    const { page, limit, sortField, sortOrder } = dataTable;
    const skip = (page - 1) * limit;

    const queryBuilder = this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.relatedPlatforms', 'platform')
      .leftJoinAndSelect('article.relatedGenres', 'genre')
      .leftJoinAndSelect('article.relatedDevelopers', 'developer')
      .leftJoinAndSelect('article.relatedGames', 'game')
      .leftJoinAndSelect('article.template', 'template')
      .leftJoinAndSelect('article.images', 'images')
      .leftJoinAndMapOne(
        'article.coverImage',
        ArticleImage,
        'coverImage',
        'coverImage.id = article.coverImageId',
      );

    // Filtro por búsqueda
    if (filter?.search) {
      queryBuilder.andWhere(
        '(article.title LIKE :search OR article.subtitle LIKE :search OR article.content LIKE :search)',
        {
          search: `%${filter.search}%`,
        },
      );
    }

    // Filtro por plataformas
    if (filter?.platformIds && filter.platformIds.length > 0) {
      queryBuilder.andWhere('platform.id IN (:...platformIds)', {
        platformIds: filter.platformIds,
      });
    }

    // Filtro por géneros
    if (filter?.genreIds && filter.genreIds.length > 0) {
      queryBuilder.andWhere('genre.id IN (:...genreIds)', {
        genreIds: filter.genreIds,
      });
    }

    // Filtro por desarrolladores
    if (filter?.developerIds && filter.developerIds.length > 0) {
      queryBuilder.andWhere('developer.id IN (:...developerIds)', {
        developerIds: filter.developerIds,
      });
    }

    // Filtro por juegos
    if (filter?.gameIds && filter.gameIds.length > 0) {
      queryBuilder.andWhere('game.id IN (:...gameIds)', {
        gameIds: filter.gameIds,
      });
    }

    // Filtro por rango de fecha de creación
    if (filter?.creationDateRange?.start && filter?.creationDateRange?.end) {
      const startDate = new Date(filter.creationDateRange.start);
      const endDate = new Date(filter.creationDateRange.end);
      endDate.setHours(23, 59, 59, 999);

      queryBuilder.andWhere(
        'article.createdAt BETWEEN :creationStartDate AND :creationEndDate',
        {
          creationStartDate: startDate.toISOString(),
          creationEndDate: endDate.toISOString(),
        },
      );
    }

    // Filtro por rango de fecha de publicación
    if (filter?.publishedDateRange?.start && filter?.publishedDateRange?.end) {
      const startDate = new Date(filter.publishedDateRange.start);
      const endDate = new Date(filter.publishedDateRange.end);
      endDate.setHours(23, 59, 59, 999);

      queryBuilder.andWhere(
        'article.publishedAt BETWEEN :publishedStartDate AND :publishedEndDate',
        {
          publishedStartDate: startDate.toISOString(),
          publishedEndDate: endDate.toISOString(),
        },
      );
    }

    // Filtro por estado de publicación
    if (filter?.publishedStatus) {
      switch (filter.publishedStatus) {
        case PublishedStatus.PUBLISHED:
          queryBuilder.andWhere('article.published = :published', {
            published: true,
          });
          break;
        case PublishedStatus.UNPUBLISHED:
          queryBuilder.andWhere('article.published = :published', {
            published: false,
          });
          break;
        // Para PublishedStatus.ALL no necesitamos añadir ningún filtro
      }
    }

    // Ordenación
    if (sortField && sortOrder) {
      queryBuilder.orderBy(`article.${sortField}`, sortOrder);
    } else {
      // Ordenación por defecto
      queryBuilder.orderBy('article.createdAt', 'DESC');
    }

    // Obtener total y datos paginados
    const [articles, totalItems] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Transformar los resultados manteniendo la misma estructura
    const transformedArticles = articles.map((article) => {
      const { coverImageId, ...rest } = article as any;
      const coverImage = article['coverImage'];
      const contentImages =
        article['images']
          ?.filter((img) => img.id !== coverImageId)
          ?.map((img) => ({
            id: img.id,
            path: img.path,
          })) || [];

      return {
        ...rest,
        coverImage: coverImage
          ? {
              id: coverImage.id,
              path: coverImage.path,
            }
          : null,
        contentImages,
      };
    });

    return {
      data: transformedArticles as Article[],
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    };
  }

  async updateImages(articleId: number, imageIds: number[]): Promise<Article> {
    const article = await this.findOne(articleId);

    // Obtener los IDs de los juegos relacionados con el artículo
    const relatedGameIds = article.relatedGames.map((game) => game.id);

    // Verificar que las imágenes existen y pertenecen a los juegos relacionados
    const images = await this.articleImageRepository.find({
      where: {
        id: In(imageIds),
        gameId: In(relatedGameIds),
      },
    });

    if (images.length !== imageIds.length) {
      throw new NotFoundException(
        'Una o más imágenes no fueron encontradas o no pertenecen a los juegos relacionados',
      );
    }

    // Verificar que el número de imágenes coincide con el requerido por la plantilla
    if (article.template && article.template.imageCount !== imageIds.length) {
      throw new BadRequestException(
        `La plantilla "${article.template.name}" requiere exactamente ${article.template.imageCount} imágenes`,
      );
    }

    // Primero, eliminamos todas las relaciones existentes del artículo
    await this.articleImageRepository
      .createQueryBuilder()
      .relation(Article, 'images')
      .of(articleId)
      .remove(await this.articleImageRepository.find());

    // Luego, creamos las nuevas relaciones con el orden correcto
    await Promise.all(
      imageIds.map((imageId, index) =>
        Promise.all([
          // Crear la relación ManyToMany
          this.articleImageRepository
            .createQueryBuilder()
            .relation(Article, 'images')
            .of(articleId)
            .add(imageId),
          // Actualizar el orden
          this.articleImageRepository.update(
            { id: imageId },
            { order: index + 1 },
          ),
        ]),
      ),
    );

    return this.findOne(articleId);
  }

  async getHomeArticles(): Promise<HomeArticlesResponse> {
    const queryBuilder = this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.relatedGames', 'relatedGames')
      .leftJoinAndSelect('article.relatedPlatforms', 'relatedPlatforms')
      .leftJoinAndSelect('article.relatedDevelopers', 'relatedDevelopers')
      .leftJoinAndSelect('article.relatedGenres', 'relatedGenres')
      .leftJoinAndSelect('article.template', 'template')
      .leftJoinAndMapOne(
        'article.coverImage',
        ArticleImage,
        'coverImage',
        'coverImage.id = article.coverImageId',
      )
      .leftJoinAndSelect('article.images', 'images')
      .where('article.published = :published', { published: true })
      .orderBy('article.publishedAt', 'DESC');

    const articles = await queryBuilder.take(10).getMany();

    // Transformar los artículos
    const transformedArticles = articles.map((article) => ({
      ...article,
      coverImage: article['coverImage']
        ? {
            id: article['coverImage'].id,
            path: article['coverImage'].path,
          }
        : null,
      contentImages: (article['images'] || [])
        .filter((img) => img.id !== article.coverImageId)
        .sort((a, b) => a.order - b.order)
        .map((img) => ({
          id: img.id,
          path: img.path,
        })),
    }));

    // Eliminar la propiedad 'images' ya que no la necesitamos
    transformedArticles.forEach((article) => delete (article as any).images);

    return {
      coverArticle: transformedArticles[0] || null,
      topArticles: transformedArticles.slice(1, 4),
      homeArticles: transformedArticles.slice(4, 10),
    };
  }

  async getArticlesForArticlesPage(options: {
    page: number;
    limit: number;
    gameId?: number;
  }): Promise<ArticlesPageResponse> {
    const { page, limit, gameId } = options;
    const skip = (page - 1) * limit;

    // Primero obtenemos los 3 artículos más recientes
    const topArticlesQuery = this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndMapOne(
        'article.coverImage',
        ArticleImage,
        'coverImage',
        'coverImage.id = article.coverImageId',
      )
      .leftJoinAndSelect('article.relatedGames', 'relatedGames')
      .leftJoinAndSelect('article.relatedPlatforms', 'relatedPlatforms')
      .leftJoinAndSelect('article.relatedDevelopers', 'relatedDevelopers')
      .leftJoinAndSelect('article.relatedGenres', 'relatedGenres')
      .select([
        'article.id',
        'article.title',
        'article.subtitle',
        'article.updatedAt',
        'article.publishedAt',
        'coverImage.id',
        'coverImage.path',
        'relatedGames.title',
        'relatedPlatforms.name',
        'relatedDevelopers.name',
        'relatedGenres.name',
      ])
      .where('article.published = :published', { published: true })
      .orderBy('article.publishedAt', 'DESC')
      .take(3);

    const topArticles = await topArticlesQuery.getMany();

    // Luego obtenemos los artículos archivados, excluyendo los top 3
    const archivedArticlesQuery = this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndMapOne(
        'article.coverImage',
        ArticleImage,
        'coverImage',
        'coverImage.id = article.coverImageId',
      )
      .leftJoinAndSelect('article.relatedGames', 'relatedGames')
      .leftJoinAndSelect('article.relatedPlatforms', 'relatedPlatforms')
      .leftJoinAndSelect('article.relatedDevelopers', 'relatedDevelopers')
      .leftJoinAndSelect('article.relatedGenres', 'relatedGenres')
      .select([
        'article.id',
        'article.title',
        'article.subtitle',
        'article.updatedAt',
        'article.publishedAt',
        'coverImage.id',
        'coverImage.path',
        'relatedGames.title',
        'relatedPlatforms.name',
        'relatedDevelopers.name',
        'relatedGenres.name',
      ])
      .where('article.published = :published', { published: true })
      .andWhere('article.id NOT IN (:...topIds)', {
        topIds: topArticles.map((a) => a.id),
      });

    // Añadimos el filtro por juego si se proporciona gameId
    if (gameId) {
      archivedArticlesQuery.andWhere('relatedGames.id = :gameId', { gameId });
    }

    archivedArticlesQuery
      .orderBy('article.publishedAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [archivedArticles, totalItems] =
      await archivedArticlesQuery.getManyAndCount();

    // Función helper para generar el metadata
    const generateMetadata = (article: any): string => {
      const parts = [
        article.relatedGames?.map((g) => g.title),
        article.relatedDevelopers?.map((d) => d.name),
        article.relatedPlatforms?.map((p) => p.name),
        article.relatedGenres?.map((g) => g.name),
      ]
        .filter((arr) => arr && arr.length > 0)
        .map((arr) => arr.join(', '));

      return parts.join(' - ');
    };

    // Transformar los resultados
    const transformArticle = (article: any): ArticleCardResponse => ({
      id: article.id,
      title: article.title,
      subtitle: article.subtitle,
      updatedAt: article.updatedAt,
      publishedAt: article.publishedAt,
      metadata: generateMetadata(article),
      coverImage: article['coverImage']
        ? {
            id: article['coverImage'].id,
            path: article['coverImage'].path,
          }
        : null,
    });

    return {
      topArticles: topArticles.map(transformArticle),
      archivedArticles: {
        data: archivedArticles.map(transformArticle),
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async addComment(
    articleId: number,
    userId: number,
    content: string,
  ): Promise<CommentDto> {
    const article = await this.articleRepository.findOne({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException('Artículo no encontrado');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const comment = this.commentRepository.create({
      content,
      article,
      user,
    });

    await this.commentRepository.save(comment);

    return this.formatComment(await this.getCommentWithUser(comment.id));
  }

  private async checkFriendshipStatus(
    userId: number,
    otherUserId: number,
  ): Promise<{ isFriend: boolean; isPending: boolean }> {
    if (!userId) return { isFriend: false, isPending: false };

    const friendship = await this.friendshipRepository.findOne({
      where: [
        {
          sender: { id: userId },
          receiver: { id: otherUserId },
        },
        {
          sender: { id: otherUserId },
          receiver: { id: userId },
        },
      ],
    });

    if (!friendship) {
      return { isFriend: false, isPending: false };
    }

    return {
      isFriend: friendship.status === FriendshipStatus.ACCEPTED,
      isPending: friendship.status === FriendshipStatus.PENDING,
    };
  }

  private async formatComment(
    comment: Comment,
    currentUserId?: number,
  ): Promise<CommentDto> {
    const { isFriend, isPending } = await this.checkFriendshipStatus(
      currentUserId,
      comment.user.id,
    );

    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      isEdited: comment.isEdited,
      parentId: comment.parentId,
      user: {
        id: comment.user.id,
        name: comment.user.name,
        nik: comment.user.nik,
        avatarPath: comment.user.avatarPath,
        isFriend,
        isPending,
        isOnline: comment.user.isOnline,
      },
    };
  }

  private async formatCommentWithReplies(
    comment: Comment,
    currentUserId?: number,
  ): Promise<CommentDto> {
    const formattedComment = await this.formatComment(comment, currentUserId);

    if (comment.replies) {
      formattedComment.replies = await Promise.all(
        comment.replies.map((reply) =>
          this.formatCommentWithReplies(reply, currentUserId),
        ),
      );
    }

    return formattedComment;
  }

  async getComments(
    articleId: number,
    page: number,
    limit: number,
    currentUserId?: number,
  ): Promise<{
    comments: CommentDto[];
    totalItems: number;
    totalPages: number;
  }> {
    const [mainComments, total] = await this.commentRepository.findAndCount({
      where: { articleId, parentId: null },
      relations: [
        'user',
        'replies',
        'replies.user',
        'replies.replies',
        'replies.replies.user',
      ],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const formattedComments = await Promise.all(
      mainComments.map((comment) =>
        this.formatCommentWithReplies(comment, currentUserId),
      ),
    );

    return {
      comments: formattedComments,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateComment(
    commentId: number,
    userId: number,
    content: string,
  ): Promise<CommentDto> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['user'],
    });

    if (!comment) {
      throw new NotFoundException('Comentario no encontrado');
    }

    if (comment.user.id !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para editar este comentario',
      );
    }

    comment.content = content;
    comment.isEdited = true;

    const updatedComment = await this.commentRepository.save(comment);
    return this.formatComment(updatedComment);
  }

  async deleteComment(commentId: number, userId: number): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['user'],
    });

    if (!comment) {
      throw new NotFoundException('Comentario no encontrado');
    }

    if (comment.user.id !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar este comentario',
      );
    }

    await this.commentRepository.remove(comment);
  }

  private async getCommentWithUser(commentId: number): Promise<Comment> {
    return this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['user'],
    });
  }

  async addReply(
    parentCommentId: number,
    userId: number,
    content: string,
  ): Promise<CommentDto> {
    const parentComment = await this.commentRepository.findOne({
      where: { id: parentCommentId },
      relations: ['article'],
    });

    if (!parentComment) {
      throw new NotFoundException('Comentario padre no encontrado');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const reply = this.commentRepository.create({
      content,
      article: parentComment.article,
      user,
      parent: parentComment,
    });

    await this.commentRepository.save(reply);

    return this.formatComment(await this.getCommentWithUser(reply.id));
  }

  async markCommentAsRead(commentId: number): Promise<void> {
    await this.commentRepository.update({ id: commentId }, { read: true });
  }

  async getCommentReplies(
    userId: number,
    page: number,
    limit: number,
  ): Promise<{
    article: { id: number; title: string };
    replies: {
      id: number;
      content: string;
      user: { id: number; name: string; nik: string; avatarPath: string };
    }[];
    totalItems: number;
    totalPages: number;
  }> {
    const [replies, totalItems] = await this.commentRepository
      .createQueryBuilder('comment')
      .innerJoin(
        'comment.parent',
        'parentComment',
        'parentComment.userId = :userId',
        { userId },
      )
      .leftJoinAndSelect('comment.user', 'user')
      .leftJoinAndSelect('comment.article', 'article')
      .orderBy('comment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    if (replies.length === 0) {
      return {
        article: null,
        replies: [],
        totalItems: 0,
        totalPages: 0,
      };
    }

    return {
      article: {
        id: replies[0].article.id,
        title: replies[0].article.title,
      },
      replies: replies.map((reply) => ({
        id: reply.id,
        content: reply.content,
        user: {
          id: reply.user.id,
          name: reply.user.name,
          nik: reply.user.nik,
          avatarPath: reply.user.avatarPath,
        },
      })),
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    };
  }
}
