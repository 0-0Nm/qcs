import cp from 'vite-plugin-cp';
import { defineConfig, PluginOption, UserConfig } from 'vite';
import path, { resolve } from 'path';
import nodeResolve from '@rollup/plugin-node-resolve';
import { builtinModules } from 'module';
import napcatVersion from 'snowcat-vite/vite-plugin-version.js';
import { autoIncludeTSPlugin } from 'snowcat-vite/vite-auto-include.js';
import react from '@vitejs/plugin-react-swc';

// 依赖排除
const external = [
  'ws',
  'express',
  'electron',
];

const nodeModules = [...builtinModules, builtinModules.map((m) => `node:${m}`), 'node:sqlite'].flat();
const ShellBaseConfigPlugin: PluginOption[] = [
  react({ tsDecorators: true }),
  autoIncludeTSPlugin({
    entries: [
      { entry: 'snowcat.ts', dir: path.resolve(__dirname, '../snowcat-core/protocol') },
      { entry: 'snowcat.ts', dir: path.resolve(__dirname, '../snowcat-onebot/action/test') },
    ],
  }),
  cp({
    targets: [
      { src: '../snowcat-native/', dest: 'dist/native', flatten: false },
      { src: '../snowcat-webui-frontend/dist/', dest: 'dist/static/', flatten: false },
      { src: '../snowcat-webui-backend/src/assets/sw_template.js', dest: 'dist/static/' },
      { src: '../snowcat-core/external/napcat.json', dest: 'dist/config/' },
      { src: '../../package.json', dest: 'dist' },
      { src: '../snowcat-shell-loader', dest: 'dist' },
    ],
  }),
  nodeResolve(),
  napcatVersion(),
];
const ShellBaseConfig = (source_map: boolean = false) =>
  defineConfig({
    resolve: {
      conditions: ['node', 'default'],
      alias: {
        '@/snowcat-core': resolve(__dirname, '../snowcat-core'),
        '@/snowcat-common': resolve(__dirname, '../snowcat-common'),
        '@/snowcat-onebot': resolve(__dirname, '../snowcat-onebot'),
        '@/snowcat-pty': resolve(__dirname, '../snowcat-pty'),
        '@/snowcat-dpapi': resolve(__dirname, '../snowcat-dpapi'),
        '@/snowcat-webui-backend': resolve(__dirname, '../snowcat-webui-backend'),
        '@/snowcat-image-size': resolve(__dirname, '../snowcat-image-size'),
        '@/snowcat-protocol': resolve(__dirname, '../snowcat-protocol'),
      },
    },
    build: {
      sourcemap: source_map,
      target: 'esnext',
      minify: source_map ? false : 'esbuild',
      lib: {
        // SnowCat：单文件 napcat.mjs（QQ utilityProcess 对分块 ESM 相对导入兼容差）
        entry: { napcat: path.resolve(__dirname, 'snowcat.ts') },
        formats: ['es'],
        fileName: () => 'napcat.mjs',
      },
      rollupOptions: {
        external: [...nodeModules, ...external],
        output: { inlineDynamicImports: true },
      },
    },
  });
export default defineConfig(({ mode }): UserConfig => {
  if (mode === 'development') {
    return {
      ...ShellBaseConfig(true),
      plugins: [...ShellBaseConfigPlugin],
    };
  }
  return {
    ...ShellBaseConfig(),
    plugins: [...ShellBaseConfigPlugin],
  };
});
