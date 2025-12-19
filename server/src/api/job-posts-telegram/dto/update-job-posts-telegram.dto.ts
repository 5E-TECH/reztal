import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateJobPostsTelegramDto {
  @ApiProperty({ name: 'Message ID', example: '-100******' })
  @IsNotEmpty()
  @IsString()
  message_id: string;
}
