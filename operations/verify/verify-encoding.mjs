import fs from "node:fs/promises";
import path from "node:path";
import { runOperation, writeOperationReport } from "../common/operation-runner.mjs";
import { unique } from "../common/inspection.mjs";

const ROOT_DIRS = ["app", "components", "lib", "data", "scripts"];
const FILE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".json", ".md", ".css", ".mjs"]);
const PATTERNS = [
  { label: "Ã", regex: /Ã/g },
  { label: "Â", regex: /Â/g },
  { label: "â€", regex: /â€/g },
  { label: "�", regex: /�/g },
];

async function collectFiles(dir) {
  const results = [];
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist" || entry.name === ".pnpm-store") continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (FILE_EXTENSIONS.has(path.extname(entry.name))) results.push(full);
    }
  }
  try {
    await walk(path.resolve(dir));
  } catch {
    return [];
  }
  return results;
}

function countMatches(text, regex) {
  return [...text.matchAll(regex)].length;
}

await runOperation({
  scriptName: "verify-encoding",
  handler: async (context) => {
    const files = unique((await Promise.all(ROOT_DIRS.map((dir) => collectFiles(dir)))).flat());
    const findings = [];

    for (const file of files) {
      const text = await fs.readFile(file, "utf8");
      const matches = PATTERNS.flatMap((pattern) => {
        const count = countMatches(text, pattern.regex);
        return count > 0 ? [{ pattern: pattern.label, count }] : [];
      });
      if (matches.length) {
        findings.push({
          file: path.relative(process.cwd(), file),
          occurrences: matches.reduce((total, item) => total + item.count, 0),
          patterns: matches,
        });
      }
    }

    const report = {
      generatedAt: new Date().toISOString(),
      filesScanned: files.length,
      filesWithMojibake: findings.length,
      totalOccurrences: findings.reduce((total, item) => total + item.occurrences, 0),
      findings,
      cleanFiles: files.length - findings.length,
      status: findings.length ? "failed" : "passed",
    };

    await fs.mkdir(path.resolve("operations", "reports"), { recursive: true });
    await fs.writeFile(path.resolve("operations", "reports", "verify-encoding.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await writeOperationReport({
      filename: "verify-encoding.report.md",
      context,
      status: report.status.toUpperCase(),
      lines: [
        `Files scanned: ${report.filesScanned}`,
        `Files with mojibake: ${report.filesWithMojibake}`,
        `Total occurrences: ${report.totalOccurrences}`,
        "",
        ...findings.map((item) => `- ${item.file} (${item.occurrences} occurrences)`),
      ],
    });

    return report.status === "passed" ? 0 : 1;
  },
});

