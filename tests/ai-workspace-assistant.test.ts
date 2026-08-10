import assert from "node:assert/strict";
import { analyzeIdea } from "../lib/ai-workspace-assistant";

const idea = [
  "We want a Horizon Europe project on AI applied to health.",
  "The proposal will focus on medical imaging, clinical data and machine learning.",
  "Potential partners include a university hospital and a Portuguese company.",
].join(" ");

const analysis = analyzeIdea(idea, "Email");

assert.ok(analysis.titleSuggestion.length > 0);
assert.ok(analysis.summary.length > 0);
assert.ok(analysis.workspace.title.length > 0);
assert.ok(analysis.keywords.some((keyword) => /ai|health|medical imaging/i.test(keyword)));
assert.ok(/IA|Computer Vision|Transversal/i.test(analysis.area));
assert.ok(/Horizon Europe/i.test(analysis.probableProgram));
assert.ok(analysis.recommendations.length > 0);
assert.ok(analysis.shortlist.length > 0);
assert.ok(analysis.responseToResearcher.includes(analysis.recommendations[0].item.name));
assert.ok(analysis.nextSteps.length > 0);

process.stdout.write(
  `${JSON.stringify(
    {
      titleSuggestion: analysis.titleSuggestion,
      area: analysis.area,
      program: analysis.probableProgram,
      shortlist: analysis.shortlist.slice(0, 3),
      nextSteps: analysis.nextSteps.slice(0, 3),
    },
    null,
    2,
  )}\n`,
);
