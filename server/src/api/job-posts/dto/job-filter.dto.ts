import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Work_Format } from 'src/common/enums';

export class JobFilterDto {
  @ApiProperty({ name: 'Sub category name', example: 'Backend' })
  @IsNotEmpty()
  @IsString()
  sub_category: string;

  @ApiProperty({ name: 'Work format', example: Work_Format })
  @IsNotEmpty()
  @IsString()
  work_format: string;

  @ApiProperty({ name: 'Level', example: 'Junior' })
  @IsOptional()
  @IsString()
  level?: string | null;

  @ApiProperty({ name: 'Location', example: 'Tashkent sh' })
  @IsOptional()
  @IsString()
  location?: string | null;

  @ApiProperty({ name: 'Pagination', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  page: number;
}
