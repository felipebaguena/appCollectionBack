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
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { AuthGuard } from '@nestjs/passport';
import { ProfileStats } from './interfaces/profile-stats.interface';
import { UpdateUserDto } from './interfaces/update-user.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { YearlyStats } from './interfaces/yearly-stats.interface';
import { FriendDetail } from './interfaces/friend-detail.interface';
import { UserBasic } from './interfaces/user-basic.interface';

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

  @UseGuards(AuthGuard('jwt'))
  @Get('me/yearly-stats')
  async getYearlyStats(@Request() req): Promise<YearlyStats> {
    const token = req.headers.authorization.split(' ')[1];
    const userInfo = await this.usersService.getUserInfoFromToken(token);
    return this.usersService.getYearlyStats(userInfo.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/friends/requests')
  async sendFriendRequest(
    @Request() req,
    @Body() body: { nik: string; message?: string },
  ) {
    const token = req.headers.authorization.split(' ')[1];
    const userInfo = await this.usersService.getUserInfoFromToken(token);
    return this.usersService.sendFriendRequest(
      userInfo.id,
      body.nik,
      body.message,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('me/friends/requests/:requestId')
  async respondToFriendRequest(
    @Request() req,
    @Param('requestId') requestId: number,
    @Body('accept') accept: boolean,
  ) {
    const token = req.headers.authorization.split(' ')[1];
    const userInfo = await this.usersService.getUserInfoFromToken(token);
    return this.usersService.respondToFriendRequest(
      userInfo.id,
      requestId,
      accept,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/friends/requests')
  async getFriendRequests(@Request() req) {
    const token = req.headers.authorization.split(' ')[1];
    const userInfo = await this.usersService.getUserInfoFromToken(token);
    return this.usersService.getFriendRequests(userInfo.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/friends')
  async getFriends(@Request() req) {
    const token = req.headers.authorization.split(' ')[1];
    const userInfo = await this.usersService.getUserInfoFromToken(token);
    return this.usersService.getFriends(userInfo.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('me/friends/:friendId')
  async removeFriend(@Request() req, @Param('friendId') friendId: number) {
    const token = req.headers.authorization.split(' ')[1];
    const userInfo = await this.usersService.getUserInfoFromToken(token);
    return this.usersService.removeFriend(userInfo.id, friendId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/friends/:friendId/detail')
  async getFriendDetail(
    @Request() req,
    @Param('friendId') friendId: number,
  ): Promise<FriendDetail> {
    const token = req.headers.authorization.split(' ')[1];
    const userInfo = await this.usersService.getUserInfoFromToken(token);
    return this.usersService.getFriendDetail(userInfo.id, friendId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/friends/:friendId/messages')
  async sendMessage(
    @Request() req,
    @Param('friendId') friendId: number,
    @Body('content') content: string,
  ) {
    const token = req.headers.authorization.split(' ')[1];
    const userInfo = await this.usersService.getUserInfoFromToken(token);
    return this.usersService.sendMessage(userInfo.id, friendId, content);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/friends/:friendId/messages')
  async getConversation(@Request() req, @Param('friendId') friendId: number) {
    const token = req.headers.authorization.split(' ')[1];
    const userInfo = await this.usersService.getUserInfoFromToken(token);
    return this.usersService.getConversation(userInfo.id, friendId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/messages/unread-count')
  async getUnreadMessagesCount(
    @Request() req,
  ): Promise<{ unreadChats: number; unreadComments: boolean }> {
    const token = req.headers.authorization.split(' ')[1];
    const userInfo = await this.usersService.getUserInfoFromToken(token);
    return this.usersService.getUnreadMessagesCount(userInfo.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/conversations')
  async getConversations(@Request() req) {
    const token = req.headers.authorization.split(' ')[1];
    const userInfo = await this.usersService.getUserInfoFromToken(token);
    return this.usersService.getConversations(userInfo.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('basic')
  async readBasic(
    @Request() req,
    @Query('nik') nik?: string,
  ): Promise<UserBasic[]> {
    const token = req.headers.authorization.split(' ')[1];
    const userInfo = await this.usersService.getUserInfoFromToken(token);
    return this.usersService.readBasic(userInfo.id, nik);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/comments/replies')
  async getCommentReplies(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Request() req,
  ): Promise<{
    articles: {
      id: number;
      title: string;
      replies: {
        id: number;
        content: string;
        createdAt: Date;
        read: boolean;
        user: { id: number; name: string; nik: string; avatarPath: string };
      }[];
    }[];
    totalItems: number;
    totalPages: number;
  }> {
    const token = req.headers.authorization.split(' ')[1];
    const userInfo = await this.usersService.getUserInfoFromToken(token);
    return this.usersService.getCommentReplies(userInfo.id, page, limit);
  }
}
