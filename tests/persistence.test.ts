import assert from "node:assert/strict";
import { loadSfipState, saveSfipState, type StorageAdapter } from "../lib/sfip-state-store";

class MemoryStorage implements StorageAdapter {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const browserSession = new MemoryStorage();
const kailash = {
  mission: "decide" as const,
  workspace: {
    title: "Kailash",
    description: "IA aplicada à saúde",
    area: "IA & Computer Vision",
    researcher: "Kailash Anandrao Hambarde",
  },
  shortlist: ["CALL-077", "CALL-079", "CALL-070", "CALL-024", "CALL-026"],
  recommendation: "CALL-070",
  decisionValidated: true,
  drafted: false,
  sent: false,
  tasks: [{ id: "CALL-070", label: "Contactar Investigador", call: "Advanced Digital Skills for AI Uptake in Health", due: "01/10/2026", days: 55, done: false }],
  assistantOpen: true,
  assistantInput: "",
  assistantReply: "Shortlist guardada para validação.",
};

saveSfipState(browserSession, kailash);
const afterReload = loadSfipState(browserSession);

assert.ok(afterReload);
assert.equal(afterReload.workspace.title, "Kailash");
assert.equal(afterReload.workspace.description, "IA aplicada à saúde");
assert.deepEqual(afterReload.shortlist, kailash.shortlist);
assert.equal(afterReload.recommendation, "CALL-070");
assert.equal(afterReload.decisionValidated, true);
assert.deepEqual(afterReload.tasks, kailash.tasks);

process.stdout.write("Workspace Kailash → 5 calls → guardar → reload → continuam lá? SIM\n");
