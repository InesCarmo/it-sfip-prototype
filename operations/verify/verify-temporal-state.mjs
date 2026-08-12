import fs from "node:fs/promises";
import path from "node:path";
import { runOperation, writeOperationReport } from "../common/operation-runner.mjs";
import { readJson } from "../common/inspection.mjs";
import { computeDaysRemaining, computeTemporalCallState } from "../../lib/sfip-temporal-state.js";

await runOperation({
  scriptName: "verify-temporal-state",
  handler: async (context) => {
    const model = await readJson("data/sfip-canonical-model.json");
    const exceptions = [];
    const rows = (model.calls ?? []).map((call) => {
      const computedState = computeTemporalCallState({
        openedAt: call.dates?.openedAt ?? null,
        deadlineAt: call.dates?.deadlineAt ?? null,
      });
      const daysRemaining = computeDaysRemaining(call.dates?.deadlineAt ?? null);
      const urgency = daysRemaining === null ? "Por confirmar" : daysRemaining <= 30 ? "Alta" : daysRemaining <= 90 ? "Média" : "Baixa";
      const priority = computedState === "Aberta" && daysRemaining !== null && daysRemaining <= 30
        ? "1 - Estratégica"
        : computedState === "Aberta"
          ? "2 - Relevante"
          : "3 - Oportunidade";

      if (call.status && call.status !== computedState) {
        exceptions.push(`${call.id}: status=${call.status} computed=${computedState}`);
      }
      if (call.dates?.deadlineAt && daysRemaining !== null && daysRemaining < 0 && computedState !== "Encerrada") {
        exceptions.push(`${call.id}: deadline vencida mas estado=${computedState}`);
      }
      if (computedState === "Prevista" && daysRemaining !== null && daysRemaining < 0) {
        exceptions.push(`${call.id}: prevista com prazo passado`);
      }

      return {
        id: call.id,
        name: call.officialTitle,
        deadline: call.dates?.deadlineAt ?? null,
        stateStored: call.status,
        stateComputed: computedState,
        daysRemaining,
        urgency,
        priority,
      };
    });

    const report = {
      generatedAt: new Date().toISOString(),
      totalCalls: rows.length,
      exceptions,
      exceptionCount: exceptions.length,
      stateMismatchCount: rows.filter((row) => row.stateStored !== row.stateComputed).length,
      openWithPastDeadline: rows.filter((row) => row.stateComputed === "Aberta" && (row.daysRemaining ?? 9999) < 0),
      plannedWithPastDeadline: rows.filter((row) => row.stateComputed === "Prevista" && (row.daysRemaining ?? 9999) < 0),
      status: exceptions.length ? "warning" : "passed",
    };

    await fs.mkdir(path.resolve("operations", "reports"), { recursive: true });
    await fs.writeFile(path.resolve("operations", "reports", "verify-temporal-state.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await writeOperationReport({
      filename: "verify-temporal-state.report.md",
      context,
      status: report.status.toUpperCase(),
      lines: [
        `Total calls: ${report.totalCalls}`,
        `Exceptions: ${report.exceptionCount}`,
        `State mismatches: ${report.stateMismatchCount}`,
        `Open with past deadline: ${report.openWithPastDeadline.length}`,
        `Planned with past deadline: ${report.plannedWithPastDeadline.length}`,
        ...exceptions.slice(0, 20).map((item) => `- ${item}`),
      ],
    });

    return 0;
  },
});

