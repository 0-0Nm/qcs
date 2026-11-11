import { ConfigBase, SnowCatCore } from 'snowcat-core';

import { SnowCatProtocolConfig, SnowCatProtocolConfigSchema } from './config';

export class SnowCatProtocolConfigLoader extends ConfigBase<SnowCatProtocolConfig> {
  constructor (core: SnowCatCore, configPath: string) {
    super('napcat_protocol', core, configPath, SnowCatProtocolConfigSchema);
  }
}

export * from './config';
