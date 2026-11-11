import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@/snowcat-rpc': resolve(__dirname, '../snowcat-rpc'),
      '@/snowcat-image-size': resolve(__dirname, '../snowcat-image-size'),
      '@/snowcat-test': resolve(__dirname, '.'),
      '@/snowcat-common': resolve(__dirname, '../snowcat-common'),
      '@/snowcat-core': resolve(__dirname, '../snowcat-core'),
      '@/snowcat-onebot': resolve(__dirname, '../snowcat-onebot'),
      'snowcat-protobuf': resolve(__dirname, '../snowcat-protobuf/NapProto.ts'),
    },
  },
});
