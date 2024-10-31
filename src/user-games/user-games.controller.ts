import {
  Controller,
  Post,
  Delete,
  Put,
  Body,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserGamesService } from './user-games.service';

@Controller('user-games')
@UseGuards(AuthGuard('jwt'))
export class UserGamesController {
  constructor(private readonly userGamesService: UserGamesService) {}

  @Get('me')
  async getCollection(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: 'rating' | 'addedAt',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.userGamesService.getUserCollection(req.user.userId, {
      page,
      limit,
      sortBy,
      sortOrder,
    });
  }

  @Post('me')
  async addToCollection(
    @Request() req,
    @Body()
    body: {
      gameId: number;
      rating?: number;
      status?: number;
      complete?: boolean;
      notes?: string;
    },
  ) {
    const { gameId, ...data } = body;
    return this.userGamesService.addGameToCollection(
      req.user.userId,
      gameId,
      data,
    );
  }

  @Delete('me')
  async removeFromCollection(@Request() req, @Body() body: { gameId: number }) {
    return this.userGamesService.removeGameFromCollection(
      req.user.userId,
      body.gameId,
    );
  }

  @Put('me')
  async updateGameDetails(
    @Request() req,
    @Body()
    body: {
      gameId: number;
      rating?: number;
      status?: number;
      complete?: boolean;
      notes?: string;
    },
  ) {
    const { gameId, ...data } = body;
    return this.userGamesService.updateGameDetails(
      req.user.userId,
      gameId,
      data,
    );
  }

  @Get('me/games')
  async getUserGames(@Request() req) {
    return this.userGamesService.getUserGames(req.user.userId);
  }
}
