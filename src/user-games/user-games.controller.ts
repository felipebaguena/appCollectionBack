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
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserGamesService } from './user-games.service';
import { MyCollectionSortType } from './user-games.enum';

@Controller('user-games')
@UseGuards(AuthGuard('jwt'))
export class UserGamesController {
  constructor(private readonly userGamesService: UserGamesService) {}

  @Post('collection')
  async getCollection(
    @Request() req,
    @Body()
    body: {
      collection: {
        page: number;
        limit: number;
        sortType: MyCollectionSortType;
      };
      filter?: {
        search?: string;
        platformIds?: number[];
        genreIds?: number[];
        developerIds?: number[];
        yearRange?: {
          start?: number;
          end?: number;
        };
      };
    },
  ) {
    return this.userGamesService.getUserCollection(req.user.userId, body);
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
      platformIds?: number[];
      owned?: boolean;
      wished?: boolean;
    },
  ) {
    const { gameId, ...data } = body;
    return this.userGamesService.addGameToCollection(
      req.user.userId,
      gameId,
      data,
    );
  }

  @Delete(':gameId')
  async removeFromCollection(@Request() req, @Param('gameId') gameId: number) {
    return this.userGamesService.removeGameFromCollection(
      req.user.userId,
      gameId,
    );
  }

  @Put(':gameId')
  async updateGameDetails(
    @Request() req,
    @Param('gameId') gameId: number,
    @Body()
    data: {
      rating?: number;
      status?: number;
      complete?: boolean;
      notes?: string;
      platformIds?: number[];
      owned?: boolean;
      wished?: boolean;
    },
  ) {
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

  @Get(':gameId/details')
  @UseGuards(AuthGuard('jwt'))
  async getUserGameDetails(@Request() req, @Param('gameId') gameId: number) {
    return this.userGamesService.getUserGameDetails(req.user.userId, gameId);
  }
}
