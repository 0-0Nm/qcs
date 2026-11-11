// SnowCat: 把 vite 分块产物合成单文件 napcat.mjs（QQ utilityProcess 对多块 ESM 兼容差）
import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import fs from 'node:fs';

const dist = './dist';
const input = `${dist}/napcat.mjs`;
const bundle = await rollup({
  input,
  external: (id) => /^(node:|fs|path|os|url|http|https|net|crypto|zlib|stream|events|util|child_process|worker_threads|readline|assert|buffer|querystring|string_decoder|timers|tls|dns|dgram|cluster|v8|vm|inspector|module|perf_hooks|process|tty|constants)/.test(id) || id.startsWith('.') === false && !id.startsWith('/'),
  plugins: [nodeResolve()],
});
const { output } = await bundle.generate({ format: 'es', inlineDynamicImports: true });
fs.writeFileSync(`${dist}/napcat.single.mjs`, output[0].code);
console.log('single bundle:', output[0].code.length, 'bytes');
