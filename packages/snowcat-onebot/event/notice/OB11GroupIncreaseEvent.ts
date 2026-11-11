import { OB11GroupNoticeEvent } from './OB11GroupNoticeEvent';
import { SnowCatCore } from 'snowcat-core';

type GroupIncreaseSubType = 'approve' | 'invite';

export class OB11GroupIncreaseEvent extends OB11GroupNoticeEvent {
  notice_type = 'group_increase';
  operator_id: number;
  sub_type: GroupIncreaseSubType;

  constructor (core: SnowCatCore, groupId: number, userId: number, operatorId: number, subType: GroupIncreaseSubType = 'approve') {
    super(core, groupId, userId);
    this.group_id = groupId;
    this.operator_id = operatorId;
    this.user_id = userId;
    this.sub_type = subType;
  }
}
