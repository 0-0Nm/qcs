/**
 * SnowCat · 第三批动作组（SnowLuma 移植）：群相册补/群管补/自定义表情/杂项
 *
 * 底层取舍（对账定谳 2026-11-11）：
 * - 群相册 get_group_album_list：走 NapCat 现役 Web 线 getAlbumList（qun_list_album_v2，已实装）
 * - 群相册 Web 线媒体列表：getAlbumMediaListByNTQQ（NT AlbumService，已实装）
 * - get_msg_emoji_likes：NT getMsgEmojiLikesList（已实装，补 OB11 动作壳）
 * - get_friend_dress：NT getUserDetailInfo（已实装，补动作壳）
 * - fetch_sys_faces：NapCat 无目录表，返回空集占位（SnowLuma 侧是协议自编目录，待后续独立移植）
 * - get_group_todo_list/get_group_tags/set_group_reaction 等 OIDB 线：NapCat PacketApi 只透传裸包
 *   （send_packet 动作已在），SDK 级 OIDB 编解码层为后续独立批次，此批不重复造。
 */

import { OneBotAction } from '@/snowcat-onebot/action/OneBotAction';
import { ActionName } from '@/snowcat-onebot/action/router';
import { Static, Type } from '@sinclair/typebox';

// ─────────────── 群相册补 ───────────────

const AlbumListPayload = Type.Object({
  group_id: Type.Union([Type.Number(), Type.String()], { description: '群号' }),
});
export class GetGroupAlbumList extends OneBotAction<Static<typeof AlbumListPayload>, unknown> {
  override actionName = ActionName.GetGroupAlbumList;
  override actionSummary = '获取群相册列表';
  override actionDescription = '获取群相册列表（qzone Web 线 qun_list_album_v2）';
  override actionTags = ['扩展接口'];
  override payloadExample = { group_id: 123456789 };
  override returnExample = [{ id: '1', title: '相册一' }];
  override payloadSchema = AlbumListPayload;
  override returnSchema = Type.Any();

  async _handle (payload: Static<typeof AlbumListPayload>) {
    return this.core.apis.WebApi.getAlbumList(String(payload.group_id));
  }
}

const AlbumWebMediaPayload = Type.Object({
  group_id: Type.Union([Type.Number(), Type.String()], { description: '群号' }),
  album_id: Type.String({ description: '相册id（来自 get_group_album_list）' }),
});
export class GetGroupAlbumMediaListWeb extends OneBotAction<Static<typeof AlbumWebMediaPayload>, unknown> {
  override actionName = ActionName.GetGroupAlbumMediaListOnly;
  override actionSummary = '获取群相册媒体列表（Web线）';
  override actionDescription = '经 NT AlbumService 读取群相册媒体列表（与 get_group_album_media_list 分页线并存）';
  override actionTags = ['扩展接口'];
  override payloadExample = { group_id: 123456789, album_id: '1' };
  override returnExample = [];
  override payloadSchema = AlbumWebMediaPayload;
  override returnSchema = Type.Any();

  async _handle (payload: Static<typeof AlbumWebMediaPayload>) {
    return this.core.apis.WebApi.getAlbumMediaListByNTQQ(String(payload.group_id), payload.album_id);
  }
}

// ─────────────── 群管补 ───────────────

const MsgEmojiLikesPayload = Type.Object({
  group_id: Type.Union([Type.Number(), Type.String()], { description: '群号' }),
  message_seq: Type.Union([Type.Number(), Type.String()], { description: '消息 seq' }),
  emoji_id: Type.String({ description: '表情id' }),
  emoji_type: Type.Optional(Type.String({ description: '表情类型（1-2，省略按 id 长度推断）' })),
  cookie: Type.Optional(Type.String({ description: '翻页 cookie，来自上一页返回' })),
  count: Type.Optional(Type.Union([Type.Number(), Type.String()], { default: 20, description: '每页数量' })),
});
export class GetMsgEmojiLikes extends OneBotAction<Static<typeof MsgEmojiLikesPayload>, unknown> {
  override actionName = ActionName.GetMsgEmojiLikes;
  override actionSummary = '查询消息表情回应列表';
  override actionDescription = '查询一条群消息的表情回应（谁点了什么表情），可翻页';
  override actionTags = ['扩展接口'];
  override payloadExample = { group_id: 123456789, message_seq: 12345, emoji_id: '128077' };
  override returnExample = { cookie: '', likes: [] };
  override payloadSchema = MsgEmojiLikesPayload;
  override returnSchema = Type.Any();

  async _handle (payload: Static<typeof MsgEmojiLikesPayload>) {
    const peer = {
      chatType: 1,
      peerUin: String(payload.group_id),
      peerUid: '',
      guildId: '',
    };
    return this.core.apis.MsgApi.getMsgEmojiLikesList(
      peer,
      String(payload.message_seq),
      payload.emoji_id,
      payload.emoji_type ?? (payload.emoji_id.length > 3 ? '2' : '1'),
      payload.cookie ?? '',
      payload.count !== undefined ? +payload.count : 20,
    );
  }
}

// ─────────────── 自定义表情/装扮 ───────────────

const FriendDressPayload = Type.Object({
  user_id: Type.Optional(Type.String({ description: '目标QQ号，省略=自己' })),
});
export class GetFriendDress extends OneBotAction<Static<typeof FriendDressPayload>, unknown> {
  override actionName = ActionName.GetFriendDress;
  override actionSummary = '获取用户装扮';
  override actionDescription = '获取好友/自己的装扮信息（挂件/气泡等，getUserDetailInfo）';
  override actionTags = ['扩展接口'];
  override payloadExample = { user_id: '123456789' };
  override returnExample = { dress: {} };
  override payloadSchema = FriendDressPayload;
  override returnSchema = Type.Any();

  async _handle (payload: Static<typeof FriendDressPayload>) {
    const uin = payload.user_id ?? this.core.selfInfo.uin;
    const uid = uin === this.core.selfInfo.uin
      ? this.core.selfInfo.uid
      : await this.core.apis.UserApi.getUidByUinV2(uin);
    if (!uid) throw new Error('用户不存在');
    const info = await this.core.apis.UserApi.getUserDetailInfo(uid);
    return { dress: info as unknown as Record<string, unknown> };
  }
}

const FetchSysFacesPayload = Type.Object({
  count: Type.Optional(Type.Union([Type.Number(), Type.String()], { default: 50, description: '取回数量' })),
});
export class FetchSysFaces extends OneBotAction<Static<typeof FetchSysFacesPayload>, unknown> {
  override actionName = ActionName.FetchSysFaces;
  override actionSummary = '获取系统表情目录';
  override actionDescription = '获取 QQ 系统表情目录（占位：协议自编目录待后续批次移植，当前返回空集）';
  override actionTags = ['扩展接口'];
  override payloadExample = { count: 50 };
  override returnExample = { items: [], note: 'sys face catalog 移植批次待排' };
  override payloadSchema = FetchSysFacesPayload;
  override returnSchema = Type.Any();

  async _handle (payload: Static<typeof FetchSysFacesPayload>) {
    void payload;
    return { items: [], note: 'sys face catalog 移植批次待排' };
  }
}
