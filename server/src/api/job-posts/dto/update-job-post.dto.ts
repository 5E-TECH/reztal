import { PartialType } from '@nestjs/swagger';
import { CreateJobPostDto } from './create-resume.dto';

export class UpdateJobPostDto extends PartialType(CreateJobPostDto) {}
