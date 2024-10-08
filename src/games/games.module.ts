import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { Game } from './game.entity';
import { JwtModule } from '@nestjs/jwt';
import { RolesGuard } from '../guards/roles.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Game]),
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
  providers: [GamesService, RolesGuard],
  controllers: [GamesController],
})
export class GamesModule {}