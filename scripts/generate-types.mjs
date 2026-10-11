import { existsSync, copyFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
// Generate the secret binding type in clean CI without needing a production secret.
const temporary = !existsSync('.dev.vars');
if (temporary) copyFileSync('.dev.vars.example', '.dev.vars');
try {
  const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'types', '--strict-vars=false'], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally { if (temporary) unlinkSync('.dev.vars'); }
