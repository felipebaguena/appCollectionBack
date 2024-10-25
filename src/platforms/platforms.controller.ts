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
import { PlatformsService } from './platforms.service';
import { Platform } from './platform.entity';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';

@Controller('platforms')
export class PlatformsController {
  private readonly logger = new Logger(PlatformsController.name);

  constructor(private readonly platformsService: PlatformsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  create(@Body() platform: Partial<Platform>) {
    return this.platformsService.create(platform);
  }

  @Get()
  findAll() {
    return this.platformsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.platformsService.findOne(+id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  update(@Param('id') id: string, @Body() platform: Partial<Platform>) {
    return this.platformsService.update(+id, platform);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  remove(@Param('id') id: string) {
    return this.platformsService.remove(+id);
  }

  @Post('datatable')
  async getPlatformsForDataTable(
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
    return this.platformsService.getPlatformsForDataTable(body);
  }
}
