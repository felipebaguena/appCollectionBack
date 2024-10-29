import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Logger,
  Put,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { Developer } from './developer.entity';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';
import { DevelopersService } from './developer.service';

@Controller('developers')
export class DevelopersController {
  private readonly logger = new Logger(DevelopersController.name);

  constructor(private readonly developersService: DevelopersService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  create(@Body() developer: Partial<Developer>) {
    return this.developersService.create(developer);
  }

  @Get()
  findAll() {
    return this.developersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.developersService.findOne(+id);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.developersService.findByCode(code);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  update(@Param('id') id: string, @Body() developer: Partial<Developer>) {
    return this.developersService.update(+id, developer);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  remove(@Param('id') id: string) {
    return this.developersService.remove(+id);
  }

  @Post('datatable')
  async getDevelopersForDataTable(
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
    return this.developersService.getDevelopersForDataTable(body);
  }
}
