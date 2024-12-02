import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { RolesModule } from '../roles/roles.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Friendship } from './friendship.entity';
import { Message } from './message.entity';
import { Comment } from '../articles/comment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Friendship, Message, Comment]),
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
    RolesModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
