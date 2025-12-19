import { PartialType } from '@nestjs/swagger';
import { CreateChannelGroupDto } from './create-channel-group.dto';

export class UpdateChannelGroupDto extends PartialType(CreateChannelGroupDto) {}
