import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ImagesService } from './images.service';
import { Image } from './image.entity';

@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: './uploads/images',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Solo se permiten archivos de imagen'), false);
      }
      cb(null, true);
    },
  }))
  async create(@UploadedFile() file: Express.Multer.File, @Body() imageData: Partial<Image>) {
    console.log('Received data:', { file, imageData });
    if (!file) {
      throw new Error('No se ha subido ningún archivo');
    }
    
    const image = await this.imagesService.create({
      ...imageData,
      filename: file.filename,
      path: file.path,
      gameId: imageData.gameId,
    });
    return image;
  }

  @Get()
  async findAll() {
    return this.imagesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.imagesService.findOne(+id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  async update(@Param('id') id: string, @Body() imageData: Partial<Image>) {
    return this.imagesService.update(+id, imageData);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  async remove(@Param('id') id: string) {
    return this.imagesService.remove(+id);
  }

  @Put(':id/setCover')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERUSER')
  async setCover(@Param('id') id: string, @Body('gameId') gameId: number) {
    return this.imagesService.setCover(gameId, +id);
  }
}
