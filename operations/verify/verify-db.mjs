import fs from "node:fs/promises";
import path from "node:path";
import { runOperation, writeOperationReport } from "../common/operation-runner.mjs";
import { fileInfo, readJson } from "../common/inspection.mjs";

async function findDatabaseFiles() {
  const roots = ["data", "db", "backups", "operations", "."];
  const found = [];
  for (const root of roots) {
    try {
      const entries = await fs.readdir(path.resolve(root), { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (!/\.(sqlite|sqlite3|db)$/i.test(entry.name)) continue;
        found.push(path.resolve(root, entry.name));
      }
    } catch {
      continue;
    }
  }
  return [...new Set(found)];
}

await runOperation({
  scriptName: "verify-db",
  handler: async (context) => {
    const databaseFiles = await findDatabaseFiles();
    const artifacts = await Promise.all([
      fileInfo("data/core-data.json"),
      fileInfo("data/sfip-canonical-model.json"),
      fileInfo("data/source_manifest.json"),
    ]);

    const parseResults = [];
    for (const file of ["data/core-data.json", "data/sfip-canonical-model.json", "data/source_manifest.json"]) {
      try {
        const parsed = await readJson(file);
        parseResults.push({ file, ok: true, keys: Array.isArray(parsed) ? parsed.length : Object.keys(parsed ?? {}).length });
      } catch (error) {
        parseResults.push({ file, ok: false, error: String(error?.message ?? error) });
      }
    }

    const report = {
      generatedAt: new Date().toISOString(),
      sqliteFiles: databaseFiles,
      sqliteFileCount: databaseFiles.length,
      physicalDatabaseDetected: databaseFiles.length > 0,
      artifacts,
      parseResults,
      integrity: {
        sqliteIntegrityCheck: databaseFiles.length > 0 ? "pending manual execution" : "not applicable - no sqlite file found in repository snapshot",
        foreignKeyCheck: databaseFiles.length > 0 ? "pending manual execution" : "not applicable - no sqlite file found in repository snapshot",
      },
      status: databaseFiles.length > 0 && parseResults.every((item) => item.ok) ? "passed" : "warning",
    };

    await fs.mkdir(path.resolve("operations", "reports"), { recursive: true });
    await fs.writeFile(path.resolve("operations", "reports", "verify-db.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await writeOperationReport({
      filename: "verify-db.report.md",
      context,
      status: report.status.toUpperCase(),
      lines: [
        `SQLite files found: ${databaseFiles.length}`,
        `data/core-data.json: ${artifacts[0].exists ? "ok" : "missing"}`,
        `data/sfip-canonical-model.json: ${artifacts[1].exists ? "ok" : "missing"}`,
        `data/source_manifest.json: ${artifacts[2].exists ? "ok" : "missing"}`,
        `SQLite integrity: ${report.integrity.sqliteIntegrityCheck}`,
        `Foreign keys: ${report.integrity.foreignKeyCheck}`,
      ],
    });

    return 0;
  },
});

