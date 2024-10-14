import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Logger,
  Put,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GenresService } from './genres.service';
import { Genre } from './genre.entity';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';

@Controller('genres')
export class GenresController {
  private readonly logger = new Logger(GenresController.name);

  constructor(private readonly genresService: GenresService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  create(@Body() genre: Partial<Genre>) {
    return this.genresService.create(genre);
  }

  @Get()
  findAll() {
    return this.genresService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.genresService.findOne(+id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  update(@Param('id') id: string, @Body() genre: Partial<Genre>) {
    return this.genresService.update(+id, genre);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  remove(@Param('id') id: string) {
    return this.genresService.remove(+id);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.genresService.findByCode(code);
  }
}
