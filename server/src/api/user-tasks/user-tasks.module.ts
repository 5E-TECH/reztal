import { Module } from '@nestjs/common';
import { UserTasksService } from './user-tasks.service';
import { UserTasksController } from './user-tasks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserTaskEntity } from 'src/core/entity/user-task.entity';
import { TasksEntity } from 'src/core/entity/tasks.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserTaskEntity, TasksEntity])],
  controllers: [UserTasksController],
  providers: [UserTasksService],
})
export class UserTasksModule {}
