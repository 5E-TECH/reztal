import { Injectable } from '@nestjs/common';
import { CreateChannelGroupDto } from './dto/create-channel-group.dto';
import { UpdateChannelGroupDto } from './dto/update-channel-group.dto';

@Injectable()
export class ChannelGroupService {
  create(createChannelGroupDto: CreateChannelGroupDto) {
    return 'This action adds a new channelGroup';
  }

  findAll() {
    return `This action returns all channelGroup`;
  }

  findOne(id: number) {
    return `This action returns a #${id} channelGroup`;
  }

  update(id: number, updateChannelGroupDto: UpdateChannelGroupDto) {
    return `This action updates a #${id} channelGroup`;
  }

  remove(id: number) {
    return `This action removes a #${id} channelGroup`;
  }
}
