import fs from "node:fs/promises";
import path from "node:path";
import { runOperation, writeOperationReport } from "../common/operation-runner.mjs";
import { readJson, unique } from "../common/inspection.mjs";

function dateStatus(openedAt, deadlineAt) {
  if (!deadlineAt) return "missing-deadline";
  if (openedAt && deadlineAt && new Date(`${deadlineAt}T00:00:00Z`) < new Date(`${openedAt}T00:00:00Z`)) return "inverted";
  return "ok";
}

await runOperation({
  scriptName: "verify-canonical-model",
  handler: async (context) => {
    const model = await readJson("data/sfip-canonical-model.json");
    const issues = [];
    const callIds = new Set();
    const researcherIds = new Set();
    const programIds = new Set((model.programs ?? []).map((item) => item.id));
    const groupIds = new Set((model.researchers ?? []).map((item) => item.groupId).filter(Boolean));

    for (const call of model.calls ?? []) {
      if (callIds.has(call.id)) issues.push(`Duplicate call id: ${call.id}`);
      callIds.add(call.id);
      if (!call.id || !call.officialTitle || !call.programId || !call.links?.official) issues.push(`Missing required field(s) in call ${call.id ?? "(unknown)"}`);
      if (!programIds.has(call.programId)) issues.push(`Unknown program reference in call ${call.id}: ${call.programId}`);
      const status = dateStatus(call.dates?.openedAt ?? null, call.dates?.deadlineAt ?? null);
      if (status !== "ok") issues.push(`Temporal inconsistency in call ${call.id}: ${status}`);
      if (call.dates?.deadlineAt && isNaN(Date.parse(`${call.dates.deadlineAt}T00:00:00Z`))) issues.push(`Invalid deadline date in call ${call.id}`);
    }

    for (const researcher of model.researchers ?? []) {
      if (researcherIds.has(researcher.id)) issues.push(`Duplicate researcher id: ${researcher.id}`);
      researcherIds.add(researcher.id);
      if (researcher.groupId && !groupIds.has(researcher.groupId)) issues.push(`Unknown researcher group reference ${researcher.groupId} for ${researcher.id}`);
      if (!researcher.name || !researcher.active) issues.push(`Inactive or unnamed researcher: ${researcher.id}`);
    }

    const uniqueCallPrograms = unique((model.calls ?? []).map((item) => item.programId));
    const report = {
      generatedAt: new Date().toISOString(),
      valid: issues.length === 0,
      counts: {
        sources: (model.sources ?? []).length,
        programs: (model.programs ?? []).length,
        calls: (model.calls ?? []).length,
        callIntelligence: (model.callIntelligence ?? []).length,
        radar: (model.radar ?? []).length,
        events: (model.events ?? []).length,
        companies: (model.companies ?? []).length,
        institutions: (model.institutions ?? []).length,
        researchers: (model.researchers ?? []).length,
        workspaces: (model.workspaces ?? []).length,
        campaigns: (model.campaigns ?? []).length,
        history: (model.history ?? []).length,
        knowledgeIndex: (model.knowledgeIndex ?? []).length,
      },
      uniqueCallPrograms: uniqueCallPrograms.length,
      issues,
      status: issues.length ? "failed" : "passed",
    };

    await fs.mkdir(path.resolve("operations", "reports"), { recursive: true });
    await fs.writeFile(path.resolve("operations", "reports", "verify-canonical-model.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await writeOperationReport({
      filename: "verify-canonical-model.report.md",
      context,
      status: report.status.toUpperCase(),
      lines: [
        `Calls: ${report.counts.calls}`,
        `Researchers: ${report.counts.researchers}`,
        `Programs referenced by calls: ${report.uniqueCallPrograms}`,
        `Issues: ${issues.length}`,
        ...issues.slice(0, 20).map((item) => `- ${item}`),
      ],
    });

    return 0;
  },
});

