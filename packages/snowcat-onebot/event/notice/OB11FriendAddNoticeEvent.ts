import { OB11BaseNoticeEvent } from './OB11BaseNoticeEvent';
import { SnowCatCore } from 'snowcat-core';

export class OB11FriendAddNoticeEvent extends OB11BaseNoticeEvent {
  notice_type = 'friend_add';
  user_id: number;

  public constructor (core: SnowCatCore, userId: number) {
    super(core);
    this.user_id = userId;
  }
}
