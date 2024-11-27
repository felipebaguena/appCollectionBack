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
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ArticlesService } from './articles.service';
import { CommentDto } from './interfaces/comment.interface';
import { OptionalJwtGuard } from 'src/auth/optional-jwt.guard';

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
  @UseGuards(OptionalJwtGuard)
  async getComments(
    @Param('articleId') articleId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Request() req,
  ): Promise<{
    comments: CommentDto[];
    totalItems: number;
    totalPages: number;
  }> {
    const userId = req.user?.userId;
    return this.articlesService.getComments(+articleId, page, limit, userId);
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

  @Post(':commentId/reply')
  @UseGuards(AuthGuard('jwt'))
  async replyToComment(
    @Param('commentId') commentId: string,
    @Body() replyData: { content: string },
    @Request() req,
  ) {
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    return this.articlesService.addReply(
      +commentId,
      req.user.userId,
      replyData.content,
    );
  }
}
