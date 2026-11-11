import { NetworkAdapterConfig } from '@/snowcat-protocol/config/config';
import { LogWrapper } from 'snowcat-core/helper/log';
import { SnowCatCore } from 'snowcat-core';
import { SnowCatProtocolAdapter } from '@/snowcat-protocol/index';
import { ActionMap } from '@/snowcat-protocol/action';
import { SnowCatProtocolEmitEventContent, SnowCatProtocolNetworkReloadType } from '@/snowcat-protocol/network/index';

export abstract class INapCatProtocolNetworkAdapter<CT extends NetworkAdapterConfig> {
  name: string;
  isEnable: boolean = false;
  config: CT;
  readonly logger: LogWrapper;
  readonly core: SnowCatCore;
  readonly protocolContext: SnowCatProtocolAdapter;
  readonly actions: ActionMap;

  constructor (name: string, config: CT, core: SnowCatCore, protocolContext: SnowCatProtocolAdapter, actions: ActionMap) {
    this.name = name;
    this.config = structuredClone(config);
    this.core = core;
    this.protocolContext = protocolContext;
    this.actions = actions;
    this.logger = core.context.logger;
  }

  abstract onEvent<T extends SnowCatProtocolEmitEventContent> (event: T): Promise<void>;

  abstract open (): void | Promise<void>;

  abstract close (): void | Promise<void>;

  abstract reload (config: unknown): SnowCatProtocolNetworkReloadType | Promise<SnowCatProtocolNetworkReloadType>;

  get isActive (): boolean {
    return this.isEnable;
  }
}
