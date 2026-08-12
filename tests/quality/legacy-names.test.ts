import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
const scanRoots = ["app", "components", "lib"].map((segment) => path.join(root, segment));
const forbidden = ["tblCalls", "tblMatching", "tblRadar", "core-data"];

async function walk(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      files.push(...await walk(absolute));
      continue;
    }
    if (!/\.(?:ts|tsx|js|md|css)$/i.test(entry.name)) continue;
    files.push(absolute);
  }
  return files;
}

const findings: Array<{ file: string; line: number; token: string; snippet: string }> = [];
for (const directory of scanRoots) {
  for (const file of await walk(directory)) {
    const content = await fs.readFile(file, "utf8");
    content.split(/\r?\n/).forEach((line, index) => {
      const token = forbidden.find((candidate) => line.includes(candidate));
      if (token) {
        findings.push({
          file: path.relative(root, file),
          line: index + 1,
          token,
          snippet: line.trim().slice(0, 240),
        });
      }
    });
  }
}

assert.equal(findings.length, 0, `Legacy architecture references still exposed in app/components/lib:\n${findings.map((item) => `${item.file}:${item.line} [${item.token}] ${item.snippet}`).join("\n")}`);

process.stdout.write("Legacy architecture references not found in app/components/lib.\n");
