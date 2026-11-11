import { OB11GroupNoticeEvent } from './OB11GroupNoticeEvent';
import { SnowCatCore } from 'snowcat-core';

export class OB11GroupTitleEvent extends OB11GroupNoticeEvent {
  notice_type = 'notify';
  sub_type = 'title';
  title: string;

  constructor (core: SnowCatCore, groupId: number, userId: number, title: string) {
    super(core, groupId, userId);
    this.group_id = groupId;
    this.user_id = userId;
    this.title = title;
  }
}
