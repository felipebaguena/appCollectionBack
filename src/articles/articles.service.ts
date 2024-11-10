import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Article } from './article.entity';
import { Game } from '../games/game.entity';
import { Platform } from '../platforms/platform.entity';
import { Developer } from '../developers/developer.entity';
import { Genre } from '../genres/genre.entity';
import { ArticleTemplate } from '../article-templates/article-template.entity';
import { PublishedStatus } from './articles.enum';
import { ArticleImage } from '../article-images/article-image.entity';

@Injectable()
export class ArticlesService {
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
  ) {}

  async create(
    article: Partial<Article> & {
      relatedGames?: number[];
      relatedPlatforms?: number[];
      relatedDevelopers?: number[];
      relatedGenres?: number[];
      templateId?: number;
    },
  ): Promise<Article> {
    const {
      relatedGames = [],
      relatedPlatforms = [],
      relatedDevelopers = [],
      relatedGenres = [],
      templateId,
      ...articleData
    } = article;

    let newArticle = this.articleRepository.create(articleData);

    if (templateId) {
      const template = await this.templateRepository.findOne({
        where: { id: templateId },
      });
      if (!template) {
        throw new NotFoundException('Plantilla no encontrada');
      }
      newArticle.template = template;
    }

    if (relatedGames.length) {
      const games = await this.gameRepository.findBy({
        id: In(relatedGames),
      });
      if (games.length !== relatedGames.length) {
        throw new NotFoundException('Uno o más juegos no encontrados');
      }
      newArticle.relatedGames = games;
    }

    if (relatedPlatforms.length) {
      const platforms = await this.platformRepository.findBy({
        id: In(relatedPlatforms),
      });
      if (platforms.length !== relatedPlatforms.length) {
        throw new NotFoundException('Una o más plataformas no encontradas');
      }
      newArticle.relatedPlatforms = platforms;
    }

    if (relatedDevelopers.length) {
      const developers = await this.developerRepository.findBy({
        id: In(relatedDevelopers),
      });
      if (developers.length !== relatedDevelopers.length) {
        throw new NotFoundException('Uno o más desarrolladores no encontrados');
      }
      newArticle.relatedDevelopers = developers;
    }

    if (relatedGenres.length) {
      const genres = await this.genreRepository.findBy({
        id: In(relatedGenres),
      });
      if (genres.length !== relatedGenres.length) {
        throw new NotFoundException('Uno o más géneros no encontrados');
      }
      newArticle.relatedGenres = genres;
    }

    return this.articleRepository.save(newArticle);
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
    const article = await this.articleRepository.findOne({
      where: { id },
      relations: [
        'relatedGames',
        'relatedPlatforms',
        'relatedDevelopers',
        'relatedGenres',
        'template',
      ],
    });

    if (!article) {
      throw new NotFoundException(`Artículo con ID ${id} no encontrado`);
    }

    return article;
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
      .leftJoinAndSelect('article.template', 'template');

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

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: articles,
      totalItems,
      totalPages,
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

    // Primero, desvinculamos todas las imágenes actuales del artículo
    await this.articleImageRepository.update(
      { articleId },
      { articleId: null },
    );

    // Luego, actualizamos las nuevas imágenes para que pertenezcan a este artículo
    await Promise.all(
      imageIds.map((imageId, index) =>
        this.articleImageRepository.update(
          { id: imageId },
          {
            articleId: articleId,
            order: index + 1,
          },
        ),
      ),
    );

    return this.findOne(articleId);
  }
}
