import { SnowCatCore } from 'snowcat-core';
import { OB11BaseRequestEvent } from './OB11BaseRequestEvent';

export class OB11FriendRequestEvent extends OB11BaseRequestEvent {
  override request_type = 'friend';

  user_id: number;
  comment: string;
  flag: string;

  constructor (core: SnowCatCore, user_id: number, comment: string, flag: string) {
    super(core);
    this.user_id = user_id;
    this.comment = comment;
    this.flag = flag;
  }
}
