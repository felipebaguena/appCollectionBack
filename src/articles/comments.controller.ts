import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ArticlesService } from './articles.service';

@Controller('articles/comments')
export class CommentsController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post('article/:articleId')
  @UseGuards(AuthGuard('jwt'))
  async addComment(
    @Param('articleId') articleId: string,
    @Body() commentData: { content: string },
    @Request() req,
  ) {
    console.log('User from request:', req.user);

    if (!req.user || !req.user.userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    return this.articlesService.addComment(
      +articleId,
      req.user.userId,
      commentData.content,
    );
  }

  @Get('article/:articleId')
  async getComments(
    @Param('articleId') articleId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.articlesService.getComments(+articleId, page, limit);
  }

  @Put(':commentId')
  @UseGuards(AuthGuard('jwt'))
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() commentData: { content: string },
    @Request() req,
  ) {
    return this.articlesService.updateComment(
      +commentId,
      req.user.userId,
      commentData.content,
    );
  }

  @Delete(':commentId')
  @UseGuards(AuthGuard('jwt'))
  async deleteComment(@Param('commentId') commentId: string, @Request() req) {
    return this.articlesService.deleteComment(+commentId, req.user.userId);
  }
}
