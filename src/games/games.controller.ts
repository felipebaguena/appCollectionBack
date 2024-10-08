import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GamesService } from './games.service';
import { Game } from './game.entity';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';

@Controller('games')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post()
  @Roles('SUPERUSER')
  create(@Body() game: Partial<Game>) {
    return this.gamesService.create(game);
  }

  @Get()
  findAll() {
    return this.gamesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gamesService.findOne(+id);
  }

  @Put(':id')
  @Roles('SUPERUSER')
  update(@Param('id') id: string, @Body() game: Partial<Game>) {
    return this.gamesService.update(+id, game);
  }

  @Delete(':id')
  @Roles('SUPERUSER')
  remove(@Param('id') id: string) {
    return this.gamesService.remove(+id);
  }
}