import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Logger,
  Query,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ArticlesService } from './articles.service';
import { Article } from './article.entity';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';
import { PublishedStatus } from './articles.enum';
import { ArticlesPageResponse } from './articles.interface';

@Controller('articles')
export class ArticlesController {
  private readonly logger = new Logger(ArticlesController.name);

  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  create(
    @Body()
    article: Partial<Article> & {
      relatedGames?: number[];
      relatedPlatforms?: number[];
      relatedGenres?: number[];
      relatedDevelopers?: number[];
      templateId?: number;
      coverImageId?: number;
      contentImageIds?: number[];
    },
  ) {
    return this.articlesService.create(article);
  }

  @Get()
  async findAll(
    @Query('published') published?: string,
    @Query('gameId') gameId?: string,
    @Query('platformId') platformId?: string,
    @Query('genreId') genreId?: string,
    @Query('developerId') developerId?: string,
  ) {
    if (gameId) {
      return this.articlesService.findByGame(+gameId);
    }

    if (platformId) {
      return this.articlesService.findByPlatform(+platformId);
    }

    if (genreId) {
      return this.articlesService.findByGenre(+genreId);
    }

    if (developerId) {
      return this.articlesService.findByDeveloper(+developerId);
    }

    if (published === 'true') {
      return this.articlesService.findPublished();
    }

    return this.articlesService.findAll();
  }

  @Get('server-time')
  getServerTime() {
    const now = new Date();
    return {
      iso: now.toISOString(),
      local: now.toString(),
      timestamp: now.getTime(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      offset: -now.getTimezoneOffset() / 60,
    };
  }

  @Get('home')
  async getHomeArticles() {
    return this.articlesService.getHomeArticles();
  }

  @Get('all-articles')
  async getArticlesForArticlesPage(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 12,
    @Query('gameId') gameId?: number,
  ): Promise<ArticlesPageResponse> {
    return this.articlesService.getArticlesForArticlesPage({
      page,
      limit,
      gameId,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.articlesService.findOne(+id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  update(
    @Param('id') id: string,
    @Body()
    articleData: Partial<Article> & {
      relatedGames?: number[];
      relatedPlatforms?: number[];
      relatedGenres?: number[];
      relatedDevelopers?: number[];
      templateId?: number;
    },
  ) {
    return this.articlesService.update(+id, articleData);
  }

  @Put(':id/images')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  async updateArticleImages(
    @Param('id') id: string,
    @Body() body: { imageIds: number[] },
  ) {
    return this.articlesService.updateImages(+id, body.imageIds);
  }

  @Put(':id/publish')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  publish(@Param('id') id: string) {
    return this.articlesService.publish(+id);
  }

  @Put(':id/unpublish')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  unpublish(@Param('id') id: string) {
    return this.articlesService.unpublish(+id);
  }

  @Put(':id/schedule')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  async schedulePublication(
    @Param('id') id: string,
    @Body() body: { publishAt: string },
  ) {
    const publishAt = new Date(body.publishAt);
    return this.articlesService.schedulePublication(+id, publishAt);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  remove(@Param('id') id: string) {
    return this.articlesService.remove(+id);
  }

  @Post('datatable')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  async getArticlesForDataTable(
    @Body()
    body: {
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
    },
  ) {
    return this.articlesService.getArticlesForDataTable(body);
  }
}
