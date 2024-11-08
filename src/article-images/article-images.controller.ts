import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { diskStorage } from 'multer';
import { AuthGuard } from '@nestjs/passport';

import { ArticleImagesService } from './article-images.service';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/guards/roles.decorator';

@Controller('article-images')
export class ArticleImagesController {
  constructor(private readonly articleImagesService: ArticleImagesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/article-images',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { articleId: number; gameId: number },
  ) {
    return this.articleImagesService.create({
      filename: file.filename,
      path: file.path,
      articleId: +body.articleId,
      gameId: +body.gameId,
    });
  }

  @Get('article/:articleId')
  async getArticleImages(@Param('articleId') articleId: string) {
    return this.articleImagesService.findByArticle(+articleId);
  }

  @Get('game/:gameId')
  async getGameArticleImages(@Param('gameId') gameId: string) {
    return this.articleImagesService.findByGame(+gameId);
  }

  @Post(':id/set-cover')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  async setCover(
    @Param('id') id: string,
    @Body('articleId') articleId: number,
  ) {
    return this.articleImagesService.setCover(articleId, +id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.articleImagesService.findOne(+id);
  }
}
