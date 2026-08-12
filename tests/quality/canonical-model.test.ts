import assert from "node:assert/strict";
import { coreEngine } from "../../lib/core-engine";
import { computeTemporalCallState } from "../../lib/sfip-temporal-state.js";

const opportunities = coreEngine.getAllOpportunities();
assert.ok(opportunities.length > 0, "Expected canonical opportunities to be available.");

for (const item of opportunities) {
  if (item.source !== "CALLS") continue;
  if (item.deadlineIso) {
    const expected = computeTemporalCallState({
      openedAt: item.raw.dates.openedAt ?? null,
      deadlineAt: item.deadlineIso,
    });
    assert.equal(item.state, expected, `Temporal state mismatch for ${item.id}`);
    const deadline = new Date(`${item.deadlineIso}T00:00:00Z`).getTime();
    const today = Date.now();
    if (deadline < today) {
      assert.notEqual(item.state, "Aberta", `Overdue call ${item.id} must not be open.`);
    }
  }
  if (item.state === "Aberta") {
    assert.ok(item.days === null || item.days >= 0, `Open call ${item.id} must not have negative days remaining.`);
  }
}

assert.ok(coreEngine.getAllOpportunities(true).every((item) => item.state !== "Aberta" || item.days === null || item.days >= 0), "No overdue call may be exposed as open.");

process.stdout.write("Canonical model temporal consistency passed.\n");
