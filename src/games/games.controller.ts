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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GamesService } from './games.service';
import { Game } from './game.entity';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gamesService.findOneWithImages(+id);
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
}
