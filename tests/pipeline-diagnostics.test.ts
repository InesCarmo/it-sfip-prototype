import assert from "node:assert/strict";
import test from "node:test";
import { buildFundingTendersPilotRun } from "../lib/funding-tenders-pipeline";
import { buildWeeklyBriefing, createAutonomousSnapshot } from "../lib/sfip-autonomy";
import { buildPipelineDiagnostics } from "../lib/pipeline-diagnostics";
import { computeTemporalCallState } from "../lib/sfip-temporal-state.js";

test("temporal state is derived from dates only", () => {
  assert.equal(computeTemporalCallState({ openedAt: "2026-09-01", deadlineAt: "2026-12-01" }), "Prevista");
  assert.equal(computeTemporalCallState({ openedAt: "2026-01-01", deadlineAt: "2026-01-15" }), "Encerrada");
});

test("pipeline diagnostics report freshness and consistency", () => {
  const report = buildFundingTendersPilotRun({ mode: "dry-run" });
  const briefing = buildWeeklyBriefing(createAutonomousSnapshot());
  const diagnostics = buildPipelineDiagnostics(report, briefing, "2026-08-10T10:00:00.000Z");

  assert.equal(diagnostics.pipelineExecuted, true);
  assert.ok(diagnostics.sourceChecks.length >= 2);
  assert.ok(diagnostics.importedFields.length > 0);
  assert.ok(diagnostics.calculatedFields.length > 0);
  assert.equal(diagnostics.stateConsistency.allPagesUseSameTemporalRule, true);
  assert.equal(diagnostics.counts.newCalls >= 0, true);
});
