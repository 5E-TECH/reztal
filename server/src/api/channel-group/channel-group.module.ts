import { Module } from '@nestjs/common';
import { ChannelGroupService } from './channel-group.service';
import { ChannelGroupController } from './channel-group.controller';

@Module({
  controllers: [ChannelGroupController],
  providers: [ChannelGroupService],
})
export class ChannelGroupModule {}
