import { OB11GroupNoticeEvent } from './OB11GroupNoticeEvent';
import { SnowCatCore } from 'snowcat-core';

export type GroupDecreaseSubType = 'leave' | 'kick' | 'kick_me' | 'disband';

export class OB11GroupDecreaseEvent extends OB11GroupNoticeEvent {
  notice_type = 'group_decrease';
  sub_type: GroupDecreaseSubType = 'leave';
  operator_id: number;

  constructor (core: SnowCatCore, groupId: number, userId: number, operatorId: number, subType: GroupDecreaseSubType = 'leave') {
    super(core, groupId, userId);
    this.group_id = groupId;
    this.operator_id = operatorId;
    this.user_id = userId;
    this.sub_type = subType;
  }
}
