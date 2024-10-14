import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Developer } from './developer.entity';
import { DevelopersController } from './developer.controller';
import { DevelopersService } from './developer.service';

@Module({
  imports: [TypeOrmModule.forFeature([Developer])],
  controllers: [DevelopersController],
  providers: [DevelopersService],
  exports: [DevelopersService],
})
export class DevelopersModule {}
