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
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GamesService } from './games.service';
import { Game } from './game.entity';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';
import { CollectionSortType } from './games.enum';
import { OptionalJwtGuard } from '../auth/optional-jwt.guard';

@Controller('games')
export class GamesController {
  private readonly logger = new Logger(GamesController.name);

  constructor(private readonly gamesService: GamesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  create(
    @Body()
    game: Partial<Game> & {
      platforms?: number[];
      genres?: number[];
      developers?: number[];
    },
  ) {
    return this.gamesService.create(game);
  }

  @Get()
  findAll() {
    return this.gamesService.findAllWithImages();
  }

  @Get('home')
  async getHomeGames(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.gamesService.getHomeGames(limit);
  }

  @Get('search')
  async searchGames(@Query('title') title: string) {
    if (!title) {
      return [];
    }
    return this.gamesService.searchGames(title);
  }

  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  async findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user?.userId || null;
    return this.gamesService.findOneWithImages(+id, userId);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  update(
    @Param('id') id: string,
    @Body()
    gameData: Partial<Game> & {
      platforms?: number[];
      genres?: number[];
      developers?: number[];
    },
  ) {
    return this.gamesService.update(+id, gameData);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  remove(@Param('id') id: string) {
    return this.gamesService.remove(+id);
  }

  @Get(':id/images')
  async getGameWithImages(@Param('id') id: string) {
    return this.gamesService.findOneWithImages(+id);
  }

  @Put(':id/setCover')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  async setCover(@Param('id') id: string, @Body('imageId') imageId: number) {
    return this.gamesService.setCover(+id, imageId);
  }

  @Post('datatable')
  async getGamesForDataTable(
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
      };
    },
  ) {
    return this.gamesService.getGamesForDataTable(body);
  }

  @Post('collection')
  @UseGuards(OptionalJwtGuard)
  async getGamesCollection(
    @Request() req,
    @Body()
    body: {
      collection: {
        page: number;
        limit: number;
        sortType: CollectionSortType;
      };
      filter?: {
        search?: string;
        platformIds?: number[];
        genreIds?: number[];
        developerIds?: number[];
        yearRange?: {
          start?: number;
          end?: number;
        } | null;
      };
    },
  ) {
    const userId = req.user?.userId || null;
    return this.gamesService.getGamesCollection({
      ...body,
      userId,
    });
  }
}
