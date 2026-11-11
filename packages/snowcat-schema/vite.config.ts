import { defineConfig } from 'vite';
import path, { resolve } from 'path';
import { builtinModules } from 'module';
import nodeResolve from '@rollup/plugin-node-resolve';
import napcatVersion from 'snowcat-vite/vite-plugin-version';
// 依赖排除
const external = [
  'ws',
  'express',
  'electron',
];
const nodeModules = [...builtinModules, builtinModules.map((m) => `node:${m}`), 'node:sqlite'].flat();

export default defineConfig({
  resolve: {
    conditions: ['node', 'default'],
    alias: {
      '@/snowcat-rpc': resolve(__dirname, '../snowcat-rpc'),
      '@/snowcat-onebot': resolve(__dirname, '../snowcat-onebot'),
      '@/snowcat-common': resolve(__dirname, '../snowcat-common'),
      '@/snowcat-schema': resolve(__dirname, './src'),
      '@/snowcat-core': resolve(__dirname, '../snowcat-core'),
      '@/snowcat-webui-backend': resolve(__dirname, '../snowcat-webui-backend'),
      '@/snowcat-image-size': resolve(__dirname, '../snowcat-image-size'),
    },
  },
  plugins: [
    nodeResolve(),
    napcatVersion(),
  ],
  build: {
    target: 'esnext',
    minify: false,
    emptyOutDir: true,
    outDir: 'dist',
    lib: {
      entry: path.resolve(__dirname, './index.ts'),
      formats: ['es'],
      fileName: () => 'schemas.mjs',
    },
    rollupOptions: {
      external: [
        ...nodeModules,
        ...external,
      ],
    },
  },
});
