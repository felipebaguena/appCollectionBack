import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticleImagesService } from './article-images.service';
import { ArticleImagesController } from './article-images.controller';
import { ArticleImage } from './article-image.entity';
import { Article } from '../articles/article.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ArticleImage, Article])],
  controllers: [ArticleImagesController],
  providers: [ArticleImagesService],
  exports: [ArticleImagesService],
})
export class ArticleImagesModule {}
