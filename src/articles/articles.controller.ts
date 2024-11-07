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
import { OptionalJwtGuard } from '../auth/optional-jwt.guard';

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
    },
  ) {
    return this.articlesService.create(article);
  }

  @Get()
  async findAll(
    @Query('published') published?: string,
    @Query('gameId') gameId?: string,
    @Query('platformId') platformId?: string,
  ) {
    if (gameId) {
      return this.articlesService.findByGame(+gameId);
    }

    if (platformId) {
      return this.articlesService.findByPlatform(+platformId);
    }

    if (published === 'true') {
      return this.articlesService.findPublished();
    }

    return this.articlesService.findAll();
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
    },
  ) {
    return this.articlesService.update(+id, articleData);
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

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  remove(@Param('id') id: string) {
    return this.articlesService.remove(+id);
  }
}
