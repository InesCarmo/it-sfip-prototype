import { spawnSync } from "node:child_process";

const steps = [
  "verify:encoding",
  "verify:canonical-model",
  "verify:db",
  "verify:pipeline",
  "verify:search",
  "verify:scheduler",
  "verify:temporal-state",
];

for (const step of steps) {
  const pnpmEntrypoint = process.env.npm_execpath || "";
  const command = process.execPath;
  const args = pnpmEntrypoint ? [pnpmEntrypoint, "run", step] : ["pnpm", "run", step];
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
  });
  if (result.error) {
    console.error(`[verify] failed to start ${step}:`, result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
