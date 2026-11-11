import { OB11GroupNoticeEvent } from './OB11GroupNoticeEvent';
import { SnowCatCore } from 'snowcat-core';

export class OB11GroupAdminNoticeEvent extends OB11GroupNoticeEvent {
  notice_type = 'group_admin';
  sub_type: 'set' | 'unset';

  constructor (core: SnowCatCore, group_id: number, user_id: number, sub_type: 'set' | 'unset') {
    super(core, group_id, user_id);
    this.sub_type = sub_type;
  }
}
