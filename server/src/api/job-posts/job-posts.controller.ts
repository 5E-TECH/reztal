import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { JobPostsService } from './job-posts.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateJobPostDto } from './dto/update-job-post.dto';

@Controller('job-posts')
export class JobPostsController {
  constructor(private readonly jobPostsService: JobPostsService) {}

  @Post()
  create(@Body() createResumeDto: CreateResumeDto) {
    return this.jobPostsService.createResume(createResumeDto);
  }

  @Get()
  findAll() {
    return this.jobPostsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobPostsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateJobPostDto: UpdateJobPostDto) {
    return this.jobPostsService.update(+id, updateJobPostDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.jobPostsService.remove(+id);
  }
}
