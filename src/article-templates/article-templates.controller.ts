import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';
import { ArticleTemplatesService } from './article-templates.service';
import { ArticleTemplate } from './article-template.entity';

@Controller('article-templates')
export class ArticleTemplatesController {
  constructor(private readonly templatesService: ArticleTemplatesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  create(@Body() templateData: Partial<ArticleTemplate>) {
    return this.templatesService.create(templateData);
  }

  @Get()
  findAll() {
    return this.templatesService.findAll();
  }

  @Get('active')
  findActive() {
    return this.templatesService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(+id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  update(
    @Param('id') id: string,
    @Body() templateData: Partial<ArticleTemplate>,
  ) {
    return this.templatesService.update(+id, templateData);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  remove(@Param('id') id: string) {
    return this.templatesService.remove(+id);
  }
}
