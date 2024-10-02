import { Controller, Get, Post, Body, UseGuards, Request, Put } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() user: Partial<User>) {
    return this.usersService.create(user);
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
  async updateName(@Request() req, @Body('name') newName: string) {
    const token = req.headers.authorization.split(' ')[1];
    const userInfo = await this.usersService.getUserInfoFromToken(token);
    return this.usersService.updateUserName(userInfo.id, newName);
  }
}