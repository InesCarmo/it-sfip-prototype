import assert from "node:assert/strict";
import { buildWeeklyBriefing, createAutonomousSnapshot } from "../lib/sfip-autonomy";
import { coreEngine } from "../lib/core-engine";

const briefing = buildWeeklyBriefing(null);
assert.equal(briefing.summary.newCount, coreEngine.getAllOpportunities(true).length);
assert.ok(briefing.summary.webinarCount >= 0);
assert.ok(briefing.summary.brokerageCount >= 0);

const snapshot = createAutonomousSnapshot();
const closed = coreEngine.getAllOpportunities().filter((item) => item.days !== null && item.days < 0);
assert.ok(closed.every((item) => item.state === "Encerrada"));
assert.ok(snapshot.opportunityIds.length >= coreEngine.getAllOpportunities(true).length);

process.stdout.write(
  `${JSON.stringify(
    {
      newCount: briefing.summary.newCount,
      changedDeadlines: briefing.summary.changedDeadlinesCount,
      webinars: briefing.summary.webinarCount,
      brokerage: briefing.summary.brokerageCount,
      closed: briefing.summary.closedCount,
    },
    null,
    2,
  )}\n`,
);
