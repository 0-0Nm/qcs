import { OB11GroupNoticeEvent } from './OB11GroupNoticeEvent';
import { SnowCatCore } from 'snowcat-core';

export class OB11GroupNameEvent extends OB11GroupNoticeEvent {
  notice_type = 'notify';
  sub_type = 'group_name';
  name_new: string;

  constructor (core: SnowCatCore, groupId: number, userId: number, nameNew: string) {
    super(core, groupId, userId);
    this.name_new = nameNew;
  }
}
