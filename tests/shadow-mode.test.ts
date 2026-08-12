import assert from "node:assert/strict";
import { appendShadowEvent, buildShadowInsights, loadShadowState, type ShadowStorage } from "../lib/sfip-shadow-mode";

class MemoryStorage implements ShadowStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const storage = new MemoryStorage();

appendShadowEvent(storage, { mission: "discover", kind: "mission_enter", label: "discover" });
appendShadowEvent(storage, { mission: "discover", kind: "search", label: "health", value: "health", results: 0 });
appendShadowEvent(storage, { mission: "discover", kind: "search", label: "health", value: "health", results: 2 });
appendShadowEvent(storage, { mission: "discover", kind: "filter_change", label: "state", value: "Aberta" });
appendShadowEvent(storage, { mission: "discover", kind: "filter_change", label: "state", value: "Prevista" });
appendShadowEvent(storage, { mission: "discover", kind: "shortlist_add", label: "CALL-077", value: "CALL-077" });
appendShadowEvent(storage, { mission: "discover", kind: "workspace_abandon", label: "Workspace A" });

const state = loadShadowState(storage);
const insights = buildShadowInsights(state);

assert.equal(insights.friction.zeroResultSearches, 1);
assert.equal(insights.friction.repeatedSearches, 1);
assert.equal(insights.friction.abandonedWorkspaces, 1);
assert.ok(insights.totalEvents >= 7);
assert.ok(insights.topTasks.some((item) => item.label === "Pesquisas efetuadas"));
assert.ok(insights.suggestions.length > 0);

process.stdout.write("Shadow Mode local telemetry and UX Insights are persisted and summarized.\n");
