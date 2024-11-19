import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Put,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { AuthGuard } from '@nestjs/passport';
import { ProfileStats } from './interfaces/profile-stats.interface';
import { UpdateUserDto } from './interfaces/update-user.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() user: Partial<User>) {
    return this.usersService.create(user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/user-images',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `avatar-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Solo se permiten archivos de imagen'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const token = req.headers.authorization.split(' ')[1];
    const userInfo = await this.usersService.getUserInfoFromToken(token);
    return this.usersService.updateAvatar(userInfo.id, file);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getProfile(@Request() req) {
    return this.usersService.findOneByEmail(req.user.email);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('me')
  async updateUser(@Request() req, @Body() updateData: UpdateUserDto) {
    const token = req.headers.authorization.split(' ')[1];
    const userInfo = await this.usersService.getUserInfoFromToken(token);
    return this.usersService.updateUser(userInfo.id, updateData);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/stats')
  async getProfileStats(@Request() req): Promise<ProfileStats> {
    const token = req.headers.authorization.split(' ')[1];
    const userInfo = await this.usersService.getUserInfoFromToken(token);
    return this.usersService.getProfileStats(userInfo.id);
  }
}
