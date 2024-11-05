import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserGame } from './user-game.entity';
import { Game } from '../games/game.entity';
import { UserGamesController } from './user-games.controller';
import { UserGamesService } from './user-games.service';
import { User } from '../users/user.entity';
import { Platform } from '../platforms/platform.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserGame, Game, User, Platform])],
  controllers: [UserGamesController],
  providers: [UserGamesService],
  exports: [UserGamesService],
})
export class UserGamesModule {}
