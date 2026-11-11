import {
  InstanceContext,
  SnowCatCore,
} from 'snowcat-core';
import { SnowCatProtocolConfigLoader, SnowCatProtocolConfig } from '@/snowcat-protocol/config';
import { SnowCatPathWrapper } from 'snowcat-common/src/path';
import {
  SnowCatProtocolNetworkManager,
} from '@/snowcat-protocol/network';
import {
  SnowCatProtocolMsgApi,
  SnowCatProtocolUserApi,
  SnowCatProtocolGroupApi,
  SnowCatProtocolFriendApi,
} from '@/snowcat-protocol/api';
import { ActionMap, createActionMap } from '@/snowcat-protocol/action';

interface ApiListType {
  MsgApi: SnowCatProtocolMsgApi;
  UserApi: SnowCatProtocolUserApi;
  GroupApi: SnowCatProtocolGroupApi;
  FriendApi: SnowCatProtocolFriendApi;
}

// NapCat Protocol 适配器 - NapCat 私有 Bot 协议实现
export class SnowCatProtocolAdapter {
  readonly core: SnowCatCore;
  readonly context: InstanceContext;

  configLoader: SnowCatProtocolConfigLoader;
  public apis: ApiListType;
  networkManager: SnowCatProtocolNetworkManager;
  actions: ActionMap;

  constructor (core: SnowCatCore, context: InstanceContext, pathWrapper: SnowCatPathWrapper) {
    this.core = core;
    this.context = context;
    this.configLoader = new SnowCatProtocolConfigLoader(core, pathWrapper.configPath);
    this.apis = {
      MsgApi: new SnowCatProtocolMsgApi(this, core),
      UserApi: new SnowCatProtocolUserApi(this, core),
      GroupApi: new SnowCatProtocolGroupApi(this, core),
      FriendApi: new SnowCatProtocolFriendApi(this, core),
    } as const;
    this.actions = createActionMap(this, core);
    this.networkManager = new SnowCatProtocolNetworkManager();
  }

  // 检查协议是否启用
  isEnabled (): boolean {
    return this.configLoader.configData.enable;
  }

  async createProtocolLog (config: SnowCatProtocolConfig) {
    let log = '[SnowCat Protocol] 配置加载\n';
    log += `协议状态: ${config.enable ? '已启用' : '已禁用'}\n`;

    if (config.enable) {
      for (const key of config.network.httpServers) {
        log += `HTTP服务: ${key.host}:${key.port}, : ${key.enable ? '已启动' : '未启动'}\n`;
      }
      for (const key of config.network.websocketServers) {
        log += `WebSocket服务: ${key.host}:${key.port}, : ${key.enable ? '已启动' : '未启动'}\n`;
      }
      for (const key of config.network.websocketClients) {
        log += `WebSocket客户端: ${key.url}, : ${key.enable ? '已启动' : '未启动'}\n`;
      }
    }
    return log;
  }

  async initProtocol () {
    const config = this.configLoader.configData;

    // 如果协议未启用，直接返回
    if (!config.enable) {
      this.context.logger.log('[SnowCat Protocol] 协议未启用，跳过初始化');
      return;
    }

    const selfInfo = this.core.selfInfo;
    const serviceInfo = await this.createProtocolLog(config);
    this.context.logger.log(`[Notice] ${serviceInfo}`);

    // 注册网络适配器
    // 这里可以根据配置注册不同的网络适配器
    // 例如: WebSocket Server, WebSocket Client, HTTP Server 等

    await this.networkManager.openAllAdapters();

    this.context.logger.log(`[SnowCat Protocol] 初始化完成，Bot: ${selfInfo.uin}`);
  }

  async close () {
    await this.networkManager.closeAllAdapters();
    this.context.logger.log('[SnowCat Protocol] 已关闭所有网络适配器');
  }
}

export * from './types/index';
export * from './api/index';
export * from './event/index';
export * from './config/index';
export * from './network/index';
