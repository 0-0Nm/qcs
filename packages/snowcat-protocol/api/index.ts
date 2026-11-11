import { SnowCatCore } from 'snowcat-core';
import { SnowCatProtocolAdapter } from '@/snowcat-protocol/index';

// NapCat Protocol API 基类
export abstract class SnowCatProtocolApiBase {
  protected adapter: SnowCatProtocolAdapter;
  protected core: SnowCatCore;

  constructor (adapter: SnowCatProtocolAdapter, core: SnowCatCore) {
    this.adapter = adapter;
    this.core = core;
  }
}

// 消息 API
export class SnowCatProtocolMsgApi extends SnowCatProtocolApiBase {
  // 消息相关 API 方法可以在这里实现
}

// 用户 API
export class SnowCatProtocolUserApi extends SnowCatProtocolApiBase {
  // 用户相关 API 方法可以在这里实现
}

// 群组 API
export class SnowCatProtocolGroupApi extends SnowCatProtocolApiBase {
  // 群组相关 API 方法可以在这里实现
}

// 好友 API
export class SnowCatProtocolFriendApi extends SnowCatProtocolApiBase {
  // 好友相关 API 方法可以在这里实现
}
