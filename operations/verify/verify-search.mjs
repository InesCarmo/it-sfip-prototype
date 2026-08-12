import fs from "node:fs/promises";
import path from "node:path";
import { runOperation, writeOperationReport } from "../common/operation-runner.mjs";
import { readJson, normalize, tokenise } from "../common/inspection.mjs";

function search(model, query) {
  const queryTokens = tokenise(query);
  if (!queryTokens.length) return [];
  const knowledgeIndex = model.knowledgeIndex ?? [];
  const matchingIds = new Set(
    knowledgeIndex
      .filter((entry) => {
        const searchable = normalize(entry.searchableText);
        const title = normalize(entry.title);
        return queryTokens.every((token) => entry.tokens.includes(token) || title === normalize(query) || searchable.includes(` ${normalize(query)} `));
      })
      .map((entry) => `${entry.entityType}:${entry.entityId}`),
  );

  return (model.calls ?? [])
    .map((call) => ({ id: call.id, title: call.officialTitle, searchable: `${call.officialTitle} ${call.officialCode} ${call.areaPrimary} ${call.areaSecondary ?? ""} ${call.thematicKeywords.join(" ")} ${call.targetGroups.join(" ")} ${call.notes ?? ""}` }))
    .filter((item) => matchingIds.has(`call:${item.id}`) && queryTokens.every((token) => normalize(item.searchable).includes(token)));
}

await runOperation({
  scriptName: "verify-search",
  handler: async (context) => {
    const model = await readJson("data/sfip-canonical-model.json");
    const queries = ["ERC", "MSCA", "Eurostars", "STEP", "Power", "Health", "Digital Europe", "ESA"];
    const results = queries.map((query) => {
      const matches = search(model, query);
      const badTerms = query.toLowerCase() === "erc"
        ? matches.filter((item) => /mercado/i.test(item.title))
        : query.toLowerCase() === "ai"
          ? matches.filter((item) => /industriais/i.test(item.title))
          : [];
      return {
        query,
        count: matches.length,
        titles: matches.slice(0, 8).map((item) => item.title),
        falsePositives: badTerms.map((item) => item.title),
      };
    });

    const status = results.every((item) => item.falsePositives.length === 0) ? "passed" : "failed";
    const report = {
      generatedAt: new Date().toISOString(),
      queries: results,
      status,
    };

    await fs.mkdir(path.resolve("operations", "reports"), { recursive: true });
    await fs.writeFile(path.resolve("operations", "reports", "verify-search.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await writeOperationReport({
      filename: "verify-search.report.md",
      context,
      status: status.toUpperCase(),
      lines: results.flatMap((item) => [
        `${item.query}: ${item.count} result(s)`,
        ...(item.falsePositives.length ? [`  false positives: ${item.falsePositives.join(", ")}`] : []),
      ]),
    });

    return status === "passed" ? 0 : 1;
  },
});

