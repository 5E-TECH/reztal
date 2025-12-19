import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from 'src/core/entity/user.entity';
import { BcryptEncryption } from 'src/infrastructure/bcrypt';
import { UserTaskEntity } from 'src/core/entity/user-task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserTaskEntity])],
  controllers: [UserController],
  providers: [UserService, BcryptEncryption],
  exports: [UserService],
})
export class UserModule {}
