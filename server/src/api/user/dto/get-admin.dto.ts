import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetUserDto {
  @ApiProperty({ name: 'TelegramId', example: 'Telegram id here' })
  @IsNotEmpty()
  @IsString()
  telegram_id: string;
}
