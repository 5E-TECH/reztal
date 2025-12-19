import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksEntity } from 'src/core/entity/tasks.entity';
import { ChannelGroupEntity } from 'src/core/entity/channel-group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TasksEntity, ChannelGroupEntity])],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
