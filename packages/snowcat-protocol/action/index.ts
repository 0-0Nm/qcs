import { SnowCatCore } from 'snowcat-core';
import { SnowCatProtocolResponse } from '@/snowcat-protocol/types';

// 前向声明类型，避免循环依赖
import type { SnowCatProtocolAdapter } from '@/snowcat-protocol/index';

// Action 基类
export abstract class BaseAction<PayloadType = unknown, ReturnType = unknown> {
  abstract actionName: string;
  protected core: SnowCatCore;
  protected adapter: SnowCatProtocolAdapter;

  constructor (adapter: SnowCatProtocolAdapter, core: SnowCatCore) {
    this.adapter = adapter;
    this.core = core;
  }

  protected abstract _handle (payload: PayloadType): Promise<ReturnType>;

  async handle (payload: PayloadType): Promise<SnowCatProtocolResponse<ReturnType>> {
    try {
      const result = await this._handle(payload);
      return {
        status: 'ok',
        retcode: 0,
        data: result,
      };
    } catch (e) {
      return {
        status: 'failed',
        retcode: -1,
        data: null,
        message: e instanceof Error ? e.message : String(e),
      };
    }
  }
}

// Action 映射类型
export type ActionMap = Map<string, BaseAction<unknown, unknown>>;

// 创建 Action 映射

export function createActionMap (_adapter: SnowCatProtocolAdapter, _core: SnowCatCore): ActionMap {
  const actionMap = new Map<string, BaseAction<unknown, unknown>>();

  // 这里可以注册各种 Action
  // 例如: actionMap.set('send_msg', new SendMsgAction(adapter, core));

  return actionMap;
}
