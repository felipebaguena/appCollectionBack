import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GamesModule } from './games/games.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersnestController } from './generate/usersnest/usersnest.controller';
import { User } from './users/user.entity';
import { Game } from './games/game.entity';
import { Role } from './roles/role.entity';
import { RolesModule } from './roles/roles.module';
import { ImagesModule } from './images/images.module';
import { Image } from './images/image.entity';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { Platform } from './platforms/platform.entity';
import { PlatformsModule } from './platforms/platforms.module';
import { Genre } from './genres/genre.entity';
import { GenresModule } from './genres/genres.module';
import { Developer } from './developers/developer.entity';
import { DevelopersModule } from './developers/developers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: '127.0.0.1',
      port: 3306,
      username: 'root',
      password: 'elculodealyna',
      database: 'nest_ddbb',
      entities: [User, Role, Game, Image, Platform, Genre, Developer],
      synchronize: true,
      logging: true,
      logger: 'advanced-console',
    }),
    AuthModule,
    UsersModule,
    GamesModule,
    RolesModule,
    ImagesModule,
    PlatformsModule,
    GenresModule,
    DevelopersModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
  controllers: [AppController, UsersnestController],
  providers: [AppService],
})
export class AppModule {}
