import { PartialType } from '@nestjs/swagger';
import { CreateUserTaskDto } from './create-user-task.dto';

export class UpdateUserTaskDto extends PartialType(CreateUserTaskDto) {}
