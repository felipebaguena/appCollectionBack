import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticleImagesController } from './article-images.controller';
import { ArticleImagesService } from './article-images.service';
import { ArticleImage } from './article-image.entity';
import { Article } from '../articles/article.entity';
import { Game } from '../games/game.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ArticleImage, Article, Game])],
  controllers: [ArticleImagesController],
  providers: [ArticleImagesService],
  exports: [ArticleImagesService],
})
export class ArticleImagesModule {}
