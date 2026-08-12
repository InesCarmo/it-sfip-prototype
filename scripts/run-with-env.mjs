import { spawnSync } from 'node:child_process';

const [,, cmd, ...args] = process.argv;
if (!cmd) {
  console.error('Usage: node run-with-env.mjs <command> [args...]');
  process.exit(1);
}

const env = {
  ...process.env,
  WRANGLER_LOG_PATH: '.wrangler/wrangler.log',
};

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const result = spawnSync(pnpm, ['exec', cmd, ...args], {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(typeof result.status === 'number' ? result.status : 1);
}

process.exit(typeof result.status === 'number' ? result.status : 1);
