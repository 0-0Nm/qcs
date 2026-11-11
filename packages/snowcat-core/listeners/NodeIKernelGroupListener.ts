import { DataSource, Group, GroupDetailInfo, GroupListUpdateType, GroupMember, GroupNotify, ShutUpGroupMember } from '@/snowcat-core/types';

export class NodeIKernelGroupListener {
  onGroupListInited (_listEmpty: boolean): any { }
  // 发现于Win 9.9.9 23159
  onGroupMemberLevelInfoChange (..._args: unknown[]): any {

  }

  onGetGroupBulletinListResult (..._args: unknown[]): any {
  }

  onGroupAllInfoChange (..._args: unknown[]): any {
  }

  // 9.9.37-54395 新增：群通知类回调改为 List 形态，兼容映射到旧回调
  onGroupAllInfoListChange (..._args: unknown[]): any {
    return this.onGroupAllInfoChange(..._args);
  }

  onGroupDetailInfoListChange (..._args: unknown[]): any {
    return (this.onGroupDetailInfoChange as (...a: unknown[]) => unknown)(..._args);
  }

  onGroupAIOSlotInfoChange (..._args: unknown[]): any {
  }

  onGroupNotifiesUpdatedV2 (..._args: unknown[]): any {
    return (this.onGroupNotifiesUpdated as (...a: unknown[]) => unknown)(..._args);
  }

  onGroupNotifiesUnreadCountUpdatedV2 (..._args: unknown[]): any {
    return this.onGroupNotifiesUnreadCountUpdated(..._args);
  }

  onGroupBulletinChange (..._args: unknown[]): any {
  }

  onGroupBulletinRemindNotify (..._args: unknown[]): any {
  }

  onGroupArkInviteStateResult (..._args: unknown[]): any {
  }

  onGroupBulletinRichMediaDownloadComplete (..._args: unknown[]): any {
  }

  onGroupConfMemberChange (..._args: unknown[]): any {
  }

  onGroupDetailInfoChange (_detailInfo: GroupDetailInfo): any {
  }

  onGroupExtListUpdate (..._args: unknown[]): any {
  }

  onGroupFirstBulletinNotify (..._args: unknown[]): any {
  }

  onGroupListUpdate (_updateType: GroupListUpdateType, _groupList: Group[]): any {
  }

  onGroupNotifiesUpdated (_dboubt: boolean, _notifies: GroupNotify[]): any {
  }

  onGroupBulletinRichMediaProgressUpdate (..._args: unknown[]): any {
  }

  onGroupNotifiesUnreadCountUpdated (..._args: unknown[]): any {
  }

  onGroupSingleScreenNotifies (_doubt: boolean, _seq: string, _notifies: GroupNotify[]): any {
  }

  onGroupsMsgMaskResult (..._args: unknown[]): any {
  }

  onGroupStatisticInfoChange (..._args: unknown[]): any {
  }

  onJoinGroupNotify (..._args: unknown[]): any {
  }

  onJoinGroupNoVerifyFlag (..._args: unknown[]): any {
  }

  onMemberInfoChange (_groupCode: string, _dateSource: DataSource, _members: Map<string, GroupMember>): any {
  }

  onMemberListChange (_arg: {
    sceneId: string,
    ids: string[],
    infos: Map<string, GroupMember>, // uid -> GroupMember
    hasPrev: boolean,
    hasNext: boolean,
    hasRobot: boolean;
  }): any {
  }

  onSearchMemberChange (..._args: unknown[]): any {
  }

  onShutUpMemberListChanged (_groupCode: string, _members: Array<ShutUpGroupMember>): any {
  }
}
