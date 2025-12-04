import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserTasksService } from './user-tasks.service';
import { CreateUserTaskDto } from './dto/create-user-task.dto';
import { UpdateUserTaskDto } from './dto/update-user-task.dto';

@Controller('user-tasks')
export class UserTasksController {
  constructor(private readonly userTasksService: UserTasksService) {}

  @Post()
  create(@Body() createUserTaskDto: CreateUserTaskDto) {
    return this.userTasksService.create(createUserTaskDto);
  }

  @Get()
  findAll() {
    return this.userTasksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userTasksService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserTaskDto: UpdateUserTaskDto) {
    return this.userTasksService.update(+id, updateUserTaskDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userTasksService.remove(+id);
  }
}
