import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const manifest = JSON.parse(await readFile('build/.vite/manifest.json', 'utf8'));
const entries = Object.keys(manifest).filter(key => manifest[key].isEntry);
if (!entries.length) throw new Error('Missing production entry chunk');
const visited = new Set();
function collect(key) {
  if (visited.has(key)) return;
  visited.add(key);
  for (const dependency of manifest[key].imports || []) collect(dependency);
}
entries.forEach(collect);
let bytes = 0;
for (const key of visited) if (manifest[key].file.endsWith('.js')) bytes += gzipSync(await readFile(`build/${manifest[key].file}`)).byteLength;
const budget = 200 * 1024;
console.log(`Initial JavaScript including static dependencies: ${(bytes / 1024).toFixed(1)} KiB gzip (budget ${budget / 1024} KiB)`);
if (bytes > budget) process.exitCode = 1;
