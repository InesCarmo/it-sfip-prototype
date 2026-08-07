import assert from "node:assert/strict";
import { coreEngine } from "../lib/core-engine";

assert.equal(coreEngine.meta.counts.calls, 98);
assert.equal(coreEngine.getAllOpportunities().length, 98);
assert.equal(coreEngine.getAllOpportunities(true).length, 122);
assert.equal(coreEngine.meta.counts.researchers, 20);
assert.equal(coreEngine.meta.counts.matching, 98);

const auditQueries = ["health", "AI", "satellite", "energy", "ERC", "Horizon", "Digital Europe", "MSCA", "ESA", "COST", "Eurostars", "Chips", "EIT", "cybersecurity", "power", "image", "networking"];
const queryResults = Object.fromEntries(auditQueries.map(query => [query, coreEngine.searchGlobal(query).length]));
for (const [query, count] of Object.entries(queryResults)) assert.ok(count > 0, `Expected real data for ${query}`);
assert.ok(coreEngine.searchGlobal("ERC").every(item => !/mercado/i.test(item.name + item.program + item.entity + item.observations)));
assert.ok(coreEngine.searchGlobal("AI").every(item => !/industriais/i.test(item.name + item.program + item.entity + item.observations)));
assert.ok(coreEngine.searchGlobal("ESA").every(item => !/empresarial/i.test(item.name + item.program + item.entity + item.observations)));

assert.ok(coreEngine.getByProgram("Horizon Europe").length > 0);
assert.ok(coreEngine.getByGroup("Power Electronics").length > 0);
const matchedResearcher = coreEngine.getResearchers().find(researcher =>
  String(researcher.name ?? "").includes("Pedro Ricardo Morais"),
);
assert.ok(matchedResearcher, "Expected the real researcher profile for Pedro Ricardo Morais");
assert.ok(coreEngine.getByInvestigator(String(matchedResearcher.name)).length > 0);
assert.ok(coreEngine.getByDeadline(30).every(item => item.days !== null && item.days >= 0 && item.days <= 30));

const scenarios = [
  { title: "Saúde", description: "digital health clinical data medical imaging", area: "IA & Computer Vision" },
  { title: "Energia", description: "power electronics energy grid storage", group: "Power Electronics" },
  { title: "Satélite", description: "satellite GNSS earth observation communications", area: "Espaço & GNSS" },
  { title: "IA", description: "artificial intelligence machine learning computer vision", group: "Pattern and Image Analysis" },
  { title: "Matemática", description: "mathematical modelling optimisation statistics", group: "Applied Mathematics" },
];
const tops = scenarios.map(scenario => coreEngine.getContextualRecommendations(scenario, 3).map(result => result.item.id).join(","));
assert.ok(new Set(tops).size >= 4, "Context scenarios must produce materially different rankings");

assert.ok(coreEngine.selectForCommunication({ group: "Power Electronics", state: "Aberta" }).length > 0);
assert.ok(coreEngine.selectForCommunication({ type: "Mobilidade", state: "Aberta" }).length > 0);
assert.ok(coreEngine.selectForCommunication({ state: "Radar" }).every(item => item.source === "RADAR"));

process.stdout.write(`${JSON.stringify({ counts: coreEngine.meta.counts, queryResults, scenarioTopIds: tops, communication: {
  powerElectronicsOpen: coreEngine.selectForCommunication({ group: "Power Electronics", state: "Aberta" }).length,
  mobilityOpen: coreEngine.selectForCommunication({ type: "Mobilidade", state: "Aberta" }).length,
  radar: coreEngine.selectForCommunication({ state: "Radar" }).length,
} }, null, 2)}\n`);
