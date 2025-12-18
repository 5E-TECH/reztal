import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { JobPostsTelegramService } from './job-posts-telegram.service';
import { CreateJobPostsTelegramDto } from './dto/create-job-posts-telegram.dto';
import { UpdateJobPostsTelegramDto } from './dto/update-job-posts-telegram.dto';

@Controller('job-posts-telegram')
export class JobPostsTelegramController {
  constructor(
    private readonly jobPostsTelegramService: JobPostsTelegramService,
  ) {}

  @Post()
  create(@Body() createJobPostsTelegramDto: CreateJobPostsTelegramDto) {
    return this.jobPostsTelegramService.create(createJobPostsTelegramDto);
  }

  @Get()
  findAll() {
    return this.jobPostsTelegramService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobPostsTelegramService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateJobPostsTelegramDto: UpdateJobPostsTelegramDto,
  ) {
    return this.jobPostsTelegramService.update(+id, updateJobPostsTelegramDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.jobPostsTelegramService.remove(+id);
  }
}
