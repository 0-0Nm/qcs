import { SnowCatCore } from 'snowcat-core';

// NapCat Protocol 事件基类
export abstract class SnowCatProtocolEvent {
  protected core: SnowCatCore;
  public time: number;
  public self_id: number;
  public post_type: string;

  constructor (core: SnowCatCore) {
    this.core = core;
    this.time = Math.floor(Date.now() / 1000);
    this.self_id = parseInt(core.selfInfo.uin);
    this.post_type = 'event';
  }

  abstract toJSON (): Record<string, unknown>;
}

// 消息事件基类
export abstract class SnowCatProtocolMessageEvent extends SnowCatProtocolEvent {
  public message_type: 'private' | 'group';
  public message_id: number;
  public user_id: number;

  constructor (core: SnowCatCore, messageType: 'private' | 'group', messageId: number, userId: number) {
    super(core);
    this.post_type = 'message';
    this.message_type = messageType;
    this.message_id = messageId;
    this.user_id = userId;
  }
}

// 通知事件基类
export abstract class SnowCatProtocolNoticeEvent extends SnowCatProtocolEvent {
  public notice_type: string;

  constructor (core: SnowCatCore, noticeType: string) {
    super(core);
    this.post_type = 'notice';
    this.notice_type = noticeType;
  }
}

// 请求事件基类
export abstract class SnowCatProtocolRequestEvent extends SnowCatProtocolEvent {
  public request_type: string;

  constructor (core: SnowCatCore, requestType: string) {
    super(core);
    this.post_type = 'request';
    this.request_type = requestType;
  }
}

// 元事件基类
export abstract class SnowCatProtocolMetaEvent extends SnowCatProtocolEvent {
  public meta_event_type: string;

  constructor (core: SnowCatCore, metaEventType: string) {
    super(core);
    this.post_type = 'meta_event';
    this.meta_event_type = metaEventType;
  }
}
