import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateJobPostsTelegramDto {
  @ApiProperty({ name: 'Job posts id', example: 'uuid here' })
  @IsNotEmpty()
  @IsString()
  job_posts_id: string;

  @ApiProperty({ name: 'Message id', example: '-100*********' })
  @IsNotEmpty()
  @IsString()
  message_id: string;
}
