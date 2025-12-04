import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ name: 'User name', example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ name: 'Phone number', example: '+998910001122' })
  @IsNotEmpty()
  @IsPhoneNumber('UZ')
  phone_number: string;

  @ApiProperty({ name: 'Password', example: 'Password1234' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ name: 'TelegramId', example: 'Telegram id here' })
  @IsNotEmpty()
  @IsString()
  telegram_id: string;
}
