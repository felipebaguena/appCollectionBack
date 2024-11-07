import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Article } from './article.entity';
import { Game } from '../games/game.entity';
import { Platform } from '../platforms/platform.entity';
import { Developer } from '../developers/developer.entity';
import { Genre } from '../genres/genre.entity';

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
  ) {}

  async create(
    article: Partial<Article> & {
      relatedGames?: number[];
      relatedPlatforms?: number[];
      relatedDevelopers?: number[];
      relatedGenres?: number[];
    },
  ): Promise<Article> {
    const {
      relatedGames = [],
      relatedPlatforms = [],
      relatedDevelopers = [],
      relatedGenres = [],
      ...articleData
    } = article;

    let newArticle = this.articleRepository.create(articleData);

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
    },
  ): Promise<Article> {
    const article = await this.findOne(id);

    const {
      relatedGames,
      relatedPlatforms,
      relatedDevelopers,
      relatedGenres,
      ...otherData
    } = articleData;

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
}
