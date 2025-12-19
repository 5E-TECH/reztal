import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MyPostsDto {
  @ApiProperty({ name: 'Telegram id', example: 'chat telegram id here' })
  @IsNotEmpty()
  @IsString()
  telegram_id: string;
}
