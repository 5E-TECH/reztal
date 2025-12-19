import { Injectable } from '@nestjs/common';
import { CreateUserTaskDto } from './dto/create-user-task.dto';
import { UpdateUserTaskDto } from './dto/update-user-task.dto';

@Injectable()
export class UserTasksService {
  create(createUserTaskDto: CreateUserTaskDto) {
    return 'This action adds a new userTask';
  }

  findAll() {
    return `This action returns all userTasks`;
  }

  findOne(id: number) {
    return `This action returns a #${id} userTask`;
  }

  update(id: number, updateUserTaskDto: UpdateUserTaskDto) {
    return `This action updates a #${id} userTask`;
  }

  remove(id: number) {
    return `This action removes a #${id} userTask`;
  }
}
