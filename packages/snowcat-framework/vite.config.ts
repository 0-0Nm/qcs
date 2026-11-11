import cp from 'vite-plugin-cp';
import { defineConfig, PluginOption, UserConfig } from 'vite';
import path, { resolve } from 'path';
import nodeResolve from '@rollup/plugin-node-resolve';
import { autoIncludeTSPlugin } from 'snowcat-vite/vite-auto-include.js';
import { builtinModules } from 'module';
import react from '@vitejs/plugin-react-swc';
import napcatVersion from 'snowcat-vite/vite-plugin-version.js';
// 依赖排除
const external = [
  'ws',
  'express',
];
const nodeModules = [...builtinModules, builtinModules.map((m) => `node:${m}`), 'node:sqlite'].flat();
const FrameworkBaseConfigPlugin: PluginOption[] = [
  autoIncludeTSPlugin({
    entries: [
      { entry: 'snowcat.ts', dir: path.resolve(__dirname, '../snowcat-core/protocol') },
      { entry: 'snowcat.ts', dir: path.resolve(__dirname, '../snowcat-onebot/action/test') },
    ],
  }),
  react({ tsDecorators: true }),
  cp({
    targets: [
      { src: '../snowcat-napi-loader/', dest: 'dist', flatten: true },
      { src: '../snowcat-native/', dest: 'dist/native', flatten: false },
      { src: '../snowcat-core/external/napcat.json', dest: 'dist/config/' },
      { src: '../snowcat-webui-frontend/dist/', dest: 'dist/static/', flatten: false },
      { src: './napcat.cjs', dest: 'dist' },
      { src: './nativeLoader.cjs', dest: 'dist' },
      { src: './preload.cjs', dest: 'dist' },
      { src: './renderer.js', dest: 'dist' },
      { src: '../../package.json', dest: 'dist' },
      { src: '../../logo.png', dest: 'dist' },
    ],
  }),
  nodeResolve(),
  napcatVersion(),
];
const FrameworkBaseConfig = () =>
  defineConfig({
    resolve: {
      conditions: ['node', 'default'],
      alias: {
        '@/snowcat-core': resolve(__dirname, '../snowcat-core'),
        '@/snowcat-common': resolve(__dirname, '../snowcat-common'),
        '@/snowcat-onebot': resolve(__dirname, '../snowcat-onebot'),
        '@/snowcat-pty': resolve(__dirname, '../snowcat-pty'),
        '@/snowcat-webui-backend': resolve(__dirname, '../snowcat-webui-backend'),
        '@/snowcat-image-size': resolve(__dirname, '../snowcat-image-size'),
        '@/snowcat-protocol': resolve(__dirname, '../snowcat-protocol'),
        '@/snowcat-adapter': resolve(__dirname, '../snowcat-adapter'),
      },
    },
    build: {
      sourcemap: false,
      target: 'esnext',
      minify: false,
      lib: {
        entry: {
          napcat: path.resolve(__dirname, 'snowcat.ts'),
          'worker/conoutSocketWorker': path.resolve(__dirname, '../snowcat-pty/worker/conoutSocketWorker.ts'),
        },
        formats: ['es'],
        fileName: (_, entryName) => `${entryName}.mjs`,
      },
      rollupOptions: {
        external: [...nodeModules, ...external],
      },
    },
  });
export default defineConfig((): UserConfig => {
  return {
    ...FrameworkBaseConfig(),
    plugins: [...FrameworkBaseConfigPlugin],
  };
});
