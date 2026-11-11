import { ConfigBase } from 'snowcat-core/helper/config-base';
import type { SnowCatCore } from 'snowcat-core';
import { OneBotConfig } from './config';
import { TSchema } from '@sinclair/typebox';

export * from './config';

export class OB11ConfigLoader extends ConfigBase<OneBotConfig> {
  constructor (core: SnowCatCore, configPath: string, schema: TSchema) {
    super('onebot11', core, configPath, schema);
  }
}
