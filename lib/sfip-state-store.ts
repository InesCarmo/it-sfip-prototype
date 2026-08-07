import type { Mission } from "@/lib/sfip-types";

export const SFIP_STATE_KEY = "it-sfip:workspace-state:v1";

export type StoredTask = {
  id: string;
  label: string;
  call: string;
  due: string;
  days: number | null;
  done: boolean;
};

export type StoredSfipState = {
  version: 1;
  savedAt: string;
  mission: Mission;
  workspace: {
    title: string;
    description: string;
    area?: string;
    group?: string;
    researcher?: string;
    company?: string;
    program?: string;
    deadlineDays?: number;
  };
  shortlist: string[];
  recommendation: string;
  decisionValidated: boolean;
  drafted: boolean;
  sent: boolean;
  tasks: StoredTask[];
  assistantOpen: boolean;
  assistantInput: string;
  assistantReply: string;
};

export type StorageAdapter = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function saveSfipState(storage: StorageAdapter, state: Omit<StoredSfipState, "version" | "savedAt">) {
  const snapshot: StoredSfipState = { ...state, version: 1, savedAt: new Date().toISOString() };
  storage.setItem(SFIP_STATE_KEY, JSON.stringify(snapshot));
  return snapshot;
}

export function loadSfipState(storage: StorageAdapter): StoredSfipState | null {
  const serialized = storage.getItem(SFIP_STATE_KEY);
  if (!serialized) return null;
  try {
    const state = JSON.parse(serialized) as StoredSfipState;
    if (state.version !== 1 || !state.workspace || !Array.isArray(state.shortlist) || !Array.isArray(state.tasks)) return null;
    return state;
  } catch {
    return null;
  }
}

export function clearSfipState(storage: StorageAdapter) {
  storage.removeItem(SFIP_STATE_KEY);
}
