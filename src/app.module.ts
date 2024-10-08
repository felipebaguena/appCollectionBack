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
      entities: [User, Role, Game, Image],
      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    GamesModule,
    RolesModule,
    ImagesModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
  controllers: [AppController, UsersnestController],
  providers: [AppService],
})
export class AppModule {}