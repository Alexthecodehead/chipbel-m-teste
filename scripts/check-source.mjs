import { readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = ['api', 'server', 'scripts'];
const files = [];

function collect(path) {
  for (const entry of readdirSync(path)) {
    const target = join(path, entry);
    if (statSync(target).isDirectory()) collect(target);
    else if (['.js', '.mjs'].includes(extname(target)) && !target.endsWith('check-source.mjs')) files.push(target);
  }
}

for (const root of roots) collect(root);
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || `Falha de sintaxe em ${file}\n`);
    process.exit(result.status || 1);
  }
}

console.log(`Syntax check passed for ${files.length} server files.`);
