import assert from "node:assert/strict";
import { buildFundingTendersPilotRun, getFundingTendersPilotCalls } from "../lib/funding-tenders-pipeline";

const pilotItems = getFundingTendersPilotCalls();
assert.ok(pilotItems.length >= 25, "Funding & Tenders Portal pilot should cover the portal-linked calls");

const dryRun = buildFundingTendersPilotRun({ mode: "dry-run" });
assert.equal(dryRun.summary.discovered, pilotItems.length);
assert.ok(dryRun.summary.validated >= 20);
assert.ok(dryRun.summary.averageConfidence >= 70 && dryRun.summary.averageConfidence <= 100);
assert.ok(dryRun.candidates.every((candidate) => candidate.sourceLabel === "Funding & Tenders Portal"));
assert.ok(dryRun.candidates.every((candidate) => candidate.diffs.length >= 3));
assert.ok(dryRun.candidates.every((candidate) => candidate.stage.Discovery.done));

const approvedIds = new Set(
  dryRun.candidates
    .filter((candidate) => candidate.editorial.status === "approved")
    .slice(0, 5)
    .map((candidate) => candidate.item.id),
);
const applyRun = buildFundingTendersPilotRun({ mode: "apply", approvedIds });
assert.ok(applyRun.candidates.some((candidate) => candidate.publication.status === "published"));
assert.ok(applyRun.summary.published >= 0);
assert.ok(applyRun.summary.readyForPublication >= 0);

process.stdout.write(
  `${JSON.stringify(
    {
      pilotCount: pilotItems.length,
      open: dryRun.summary.open,
      planned: dryRun.summary.planned,
      validated: dryRun.summary.validated,
      confidence: dryRun.summary.averageConfidence,
      publishable: applyRun.summary.readyForPublication,
    },
    null,
    2,
  )}\n`,
);
