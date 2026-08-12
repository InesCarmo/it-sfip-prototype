import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const [,, cmd, ...args] = process.argv;
if (!cmd) {
  console.error('Usage: node run-with-env.mjs <command> [args...]');
  process.exit(1);
}

const env = {
  ...process.env,
  WRANGLER_LOG_PATH: '.wrangler/wrangler.log',
};

const localBin = process.platform === 'win32'
  ? join('node_modules', '.bin', `${cmd}.cmd`)
  : join('node_modules', '.bin', cmd);
const executable = existsSync(localBin) ? localBin : cmd;

const result = spawnSync(executable, args, {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(typeof result.status === 'number' ? result.status : 1);
}

process.exit(typeof result.status === 'number' ? result.status : 1);
