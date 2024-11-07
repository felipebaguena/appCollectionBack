import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { Article } from './article.entity';
import { Game } from '../games/game.entity';
import { Platform } from '../platforms/platform.entity';
import { Genre } from '../genres/genre.entity';
import { Developer } from '../developers/developer.entity';
import { JwtModule } from '@nestjs/jwt';
import { RolesGuard } from '../guards/roles.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article, Game, Platform, Genre, Developer]),
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
  controllers: [ArticlesController],
  providers: [ArticlesService, RolesGuard],
  exports: [ArticlesService],
})
export class ArticlesModule {}
