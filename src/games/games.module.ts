import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { Game } from './game.entity';
import { Image } from '../images/image.entity';
import { Platform } from '../platforms/platform.entity';
import { Genre } from '../genres/genre.entity';
import { Developer } from '../developers/developer.entity';
import { JwtModule } from '@nestjs/jwt';
import { RolesGuard } from '../guards/roles.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Game, Image, Platform, Genre, Developer]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION') || '1h',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [GamesController],
  providers: [GamesService, RolesGuard],
})
export class GamesModule {}
