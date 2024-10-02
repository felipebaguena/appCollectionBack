import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersnestController } from './generate/usersnest/usersnest.controller';
import { User } from './users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: '127.0.0.1',
      port: 3306,
      username: 'root',
      password: 'elculodealyna',
      database: 'nest_ddbb',
      entities: [User],
      synchronize: true,
    }),
    AuthModule,
    UsersModule
  ],
  controllers: [AppController, UsersnestController],
  providers: [AppService],
})
export class AppModule {}