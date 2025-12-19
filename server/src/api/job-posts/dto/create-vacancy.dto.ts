import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Level, Post_Status, Work_Format } from 'src/common/enums';

export class CreateVacancyDto {
  @ApiProperty({ name: 'Sub category id', example: 'uuid here' })
  @IsNotEmpty()
  @IsString()
  sub_category: string;

  @ApiProperty({ name: 'Level', example: Level })
  @IsNotEmpty()
  @IsEnum(Level)
  level: Level;

  @ApiProperty({ name: 'Work format', example: Work_Format })
  @IsNotEmpty()
  @IsEnum(Work_Format)
  work_format: Work_Format;

  @ApiProperty({ name: 'Skills', example: 'NodeJs ReactJs Swagger ...' })
  @IsNotEmpty()
  @IsString()
  skills: string;

  @ApiProperty({ name: 'Salary', example: '$500 / 6 mln / 7 000 000' })
  @IsNotEmpty()
  @IsString()
  salary: string;

  @ApiProperty({ name: 'Address', example: 'Toshkent sh / Navoiy vil' })
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiProperty({ name: 'Telegram username', example: '@username' })
  @IsNotEmpty()
  @IsString()
  telegram_username: string;

  @ApiProperty({ name: 'User', example: 'uuid here' })
  @IsNotEmpty()
  @IsString()
  user_id: string;

  @ApiProperty({ name: 'Image name', example: 'nimadur.png' })
  @IsNotEmpty()
  @IsString()
  image_path: string;
}
