import { ConfigBase } from '@/snowcat-core/helper/config-base';
import { SnowCatCore } from '@/snowcat-core/index';
import { Type, Static, TSchema } from '@sinclair/typebox';

import { Value } from '@sinclair/typebox/value';

import path from 'node:path';
import fs from 'node:fs';
import json5 from 'json5';

export const BypassOptionsSchema = Type.Object({
  hook: Type.Boolean({ default: true }),
  window: Type.Boolean({ default: true }),
  module: Type.Boolean({ default: true }),
  process: Type.Boolean({ default: true }),
  container: Type.Boolean({ default: true }),
  js: Type.Boolean({ default: true }),
});

export const SnowCatConfigSchema = Type.Object({
  fileLog: Type.Boolean({ default: false }),
  consoleLog: Type.Boolean({ default: true }),
  fileLogLevel: Type.String({ default: 'debug' }),
  consoleLogLevel: Type.String({ default: 'info' }),
  packetBackend: Type.String({ default: 'auto' }),
  packetServer: Type.String({ default: '' }),
  o3HookMode: Type.Number({ default: 0 }),
  autoTimeSync: Type.Boolean({ default: true }),
  bypass: Type.Optional(BypassOptionsSchema),
});

export type SnowCatConfigFile = Static<typeof SnowCatConfigSchema>;

/**
 * 从指定配置目录读取 napcat.json，按 SnowCatConfigSchema 校验并填充默认值
 * 用于登录前（无 SnowCatCore 实例时）的早期配置读取
 */
export function loadSnowCatConfig (configPath: string): SnowCatConfigFile {
  let data: Record<string, unknown> = {};
  try {
    const configFile = path.join(configPath, 'napcat.json');
    if (fs.existsSync(configFile)) {
      data = json5.parse(fs.readFileSync(configFile, 'utf-8'));
    }
  } catch {
    // 读取失败时使用 schema 默认值
  }
  data = Value.Parse(SnowCatConfigSchema, data) as Record<string, unknown>;
  return data as SnowCatConfigFile;
}

export class SnowCatConfigLoader extends ConfigBase<SnowCatConfigFile> {
  constructor (core: SnowCatCore, configPath: string, schema: TSchema) {
    super('napcat', core, configPath, schema);
  }
}
