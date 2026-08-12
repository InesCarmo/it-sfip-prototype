import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export function createOperationContext(scriptName, argv = process.argv.slice(2)) {
  const args = new Set(argv);
  const dryRun = !args.has("--execute");
  const reportRequested = args.has("--report");
  const executionId = randomUUID();
  const startedAt = new Date();
  const reportsDir = path.resolve("operations", "reports");

  return {
    executionId,
    scriptName,
    dryRun,
    reportRequested,
    startedAt,
    reportsDir,
    argv,
  };
}

export async function ensureReportsDir() {
  await fs.mkdir(path.resolve("operations", "reports"), { recursive: true });
}

export async function writeOperationReport({
  filename,
  context,
  status = "PLACEHOLDER",
  lines = [],
}) {
  await ensureReportsDir();
  const reportPath = path.resolve("operations", "reports", filename);
  const header = [
    `# ${context.scriptName}`,
    "",
    `- Execution UUID: ${context.executionId}`,
    `- Started at: ${context.startedAt.toISOString()}`,
    `- Mode: ${context.dryRun ? "dry-run" : "execute"}`,
    `- Status: ${status}`,
    "",
  ];
  const body = Array.isArray(lines) ? lines : [String(lines)];
  await fs.writeFile(reportPath, [...header, ...body, ""].join("\n"), "utf8");
  return reportPath;
}

export async function runOperation({ scriptName, handler }) {
  const context = createOperationContext(scriptName);
  try {
    const result = await handler(context);
    return result ?? 0;
  } catch (error) {
    console.error(`[${scriptName}]`, error);
    return 1;
  }
}

export function printModeBanner(context) {
  console.log(`[${context.scriptName}] mode=${context.dryRun ? "dry-run" : "execute"} report=${context.reportRequested}`);
}

