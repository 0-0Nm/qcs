import { NetworkAdapterConfig } from '@/snowcat-onebot/config/config';
import { LogWrapper } from 'snowcat-core/helper/log';
import { SnowCatCore } from 'snowcat-core';
import { NapCatOneBot11Adapter } from '@/snowcat-onebot/index';
import { ActionMap } from '@/snowcat-onebot/action';
import { OB11EmitEventContent, OB11NetworkReloadType } from '@/snowcat-onebot/network/index';

export abstract class IOB11NetworkAdapter<CT extends NetworkAdapterConfig> {
  name: string;
  isEnable: boolean = false;
  config: CT;
  readonly logger: LogWrapper;
  readonly core: SnowCatCore;
  readonly obContext: NapCatOneBot11Adapter;
  readonly actions: ActionMap;

  constructor (name: string, config: CT, core: SnowCatCore, obContext: NapCatOneBot11Adapter, actions: ActionMap) {
    this.name = name;
    this.config = structuredClone(config);
    this.core = core;
    this.obContext = obContext;
    this.actions = actions;
    this.logger = core.context.logger;
  }

  abstract onEvent<T extends OB11EmitEventContent> (event: T): Promise<void>;

  abstract open (): void | Promise<void>;

  abstract close (): void | Promise<void>;

  abstract reload (config: unknown): OB11NetworkReloadType | Promise<OB11NetworkReloadType>;

  get isActive (): boolean {
    return this.isEnable;
  }
}
