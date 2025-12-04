import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ChannelGroupService } from './channel-group.service';
import { CreateChannelGroupDto } from './dto/create-channel-group.dto';
import { UpdateChannelGroupDto } from './dto/update-channel-group.dto';

@Controller('channel-group')
export class ChannelGroupController {
  constructor(private readonly channelGroupService: ChannelGroupService) {}

  @Post()
  create(@Body() createChannelGroupDto: CreateChannelGroupDto) {
    return this.channelGroupService.create(createChannelGroupDto);
  }

  @Get()
  findAll() {
    return this.channelGroupService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.channelGroupService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateChannelGroupDto: UpdateChannelGroupDto) {
    return this.channelGroupService.update(+id, updateChannelGroupDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.channelGroupService.remove(+id);
  }
}
