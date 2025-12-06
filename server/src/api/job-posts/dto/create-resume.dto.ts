import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Level, Post_Status, Work_Format } from 'src/common/enums';

export class CreateResumeDto {
  @ApiProperty({ name: 'Sub category id', example: 'uuid here' })
  @IsNotEmpty()
  @IsString()
  sub_category: string;

  @ApiProperty({ name: 'Experience', example: '3 years/ 3/ 7 months ...' })
  @IsNotEmpty()
  @IsString()
  experience: string;

  @ApiProperty({ name: 'Skills', example: 'NodeJs ReactJs Swagger ...' })
  @IsNotEmpty()
  @IsString()
  skills: string;

  @ApiProperty({ name: 'Salary', example: '$500 / 6 mln / 7 000 000' })
  @IsNotEmpty()
  @IsString()
  salary: string;

  @ApiProperty({ name: 'Age', example: '21 / 21 yosh' })
  @IsNotEmpty()
  @IsString()
  age: string;

  @ApiProperty({ name: 'Address', example: 'Toshkent sh / Navoiy vil' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ name: 'Language', example: 'Rus tili, Ingliz tili ...' })
  @IsNotEmpty()
  @IsString()
  language: string;

  @ApiProperty({ name: 'Portfolio', example: 'Portfolio link here' })
  @IsNotEmpty()
  @IsString()
  portfolio: string;

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
