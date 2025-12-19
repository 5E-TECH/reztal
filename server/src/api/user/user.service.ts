import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/core/entity/user.entity';
import type { UserRepository } from 'src/core/repository/user.repository';
import { Roles } from 'src/common/enums';
import { catchError, successRes } from 'src/infrastructure/response';
import { BcryptEncryption } from 'src/infrastructure/bcrypt';
import config from 'src/config';
import { GetUserDto } from './dto/get-admin.dto';
import { In } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: UserRepository,

    private readonly bcrypt: BcryptEncryption,
  ) {}

  async onModuleInit() {
    try {
      const isSuperAdmin = await this.userRepo.findOne({
        where: { role: Roles.SUPERADMIN },
      });

      if (!isSuperAdmin) {
        const hashedPassword = await this.bcrypt.encrypt(config.ADMIN_PASSWORD);
        const superAdminthis = this.userRepo.create({
          name: config.ADMIN_NAME,
          phone_number: config.ADMIN_PHONE_NUMBER,
          telegram_id: config.ADMIN_TELEGRAM_ID,
          password: hashedPassword,
          role: Roles.SUPERADMIN,
          add_resume: true,
          see_vacancy: true,
        });
        await this.userRepo.save(superAdminthis);
      }
    } catch (error) {
      return catchError(error);
    }
  }

  async createAdmin(createUserDto: CreateUserDto) {
    try {
      const { name, password, phone_number, telegram_id } = createUserDto;

      const isExistAdmin = await this.userRepo.findOne({
        where: { phone_number },
      });
      if (isExistAdmin) {
        throw new ConflictException(
          'User with this phone number already exist',
        );
      }

      let hashedPassword: string | undefined;
      if (password) {
        hashedPassword = await this.bcrypt.encrypt(password);
      }

      const newAdmin = this.userRepo.create({
        name,
        password: hashedPassword,
        phone_number,
        telegram_id,
        role: Roles.ADMIN,
        add_resume: true,
        see_vacancy: true,
      });
      await this.userRepo.save(newAdmin);

      return successRes({}, 201, 'New admin created');
    } catch (error) {
      return catchError(error);
    }
  }

  async createCandidate(createCandidateDto: CreateUserDto) {
    try {
      const { name, password, phone_number, telegram_id } = createCandidateDto;
      const user = await this.userRepo.findOne({
        where: { phone_number },
      });
      if (!user) {
        let hashedPassword: string | undefined;
        if (password) {
          hashedPassword = await this.bcrypt.encrypt(password);
        }

        const newCandidate = this.userRepo.create({
          name,
          phone_number,
          password: hashedPassword,
          role: Roles.CANDIDATE,
          telegram_id,
          see_vacancy: false,
          add_resume: false,
        });

        await this.userRepo.save(newCandidate);

        return successRes(
          { id: newCandidate.id },
          201,
          'New candidate created',
        );
      }

      if (user.name !== name) {
        user.name = name;
        await this.userRepo.save(user);
      }

      return successRes({ id: user.id }, 200, 'User found');
    } catch (error) {
      return catchError(error);
    }
  }

  async createHr(createHrDto: CreateUserDto) {
    try {
      const { name, password, phone_number, telegram_id } = createHrDto;
      const user = await this.userRepo.findOne({
        where: { phone_number },
      });
      if (!user) {
        let hashedPassword: string | undefined;
        if (password) {
          hashedPassword = await this.bcrypt.encrypt(password);
        }

        const newUser = this.userRepo.create({
          company_name: name,
          phone_number,
          password: hashedPassword,
          role: Roles.HR,
          telegram_id,
          see_vacancy: false,
          add_resume: false,
        });

        await this.userRepo.save(newUser);

        return successRes({ id: newUser.id }, 201, 'New candidate created');
      }
      if (user.company_name !== name) {
        user.company_name = name;
        await this.userRepo.save(user);
      }

      return successRes({ id: user.id }, 200, 'User found');
    } catch (error) {
      return catchError(error);
    }
  }

  async getAdmin(getUserDto: GetUserDto) {
    try {
      const { telegram_id } = getUserDto;
      const user = await this.userRepo.findOne({
        where: { telegram_id, role: In([Roles.ADMIN, Roles.SUPERADMIN]) },
      });
      if (!user) {
        throw new NotFoundException('Admin with this id not found');
      }
      return successRes({}, 200, 'Admin found');
    } catch (error) {
      return catchError(error);
    }
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
