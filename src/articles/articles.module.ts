import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { Article } from './article.entity';
import { Game } from '../games/game.entity';
import { Platform } from '../platforms/platform.entity';
import { Developer } from '../developers/developer.entity';
import { Genre } from '../genres/genre.entity';
import { ArticleTemplate } from '../article-templates/article-template.entity';
import { ArticleImage } from '../article-images/article-image.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Article,
      Game,
      Platform,
      Developer,
      Genre,
      ArticleTemplate,
      ArticleImage,
    ]),
  ],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
