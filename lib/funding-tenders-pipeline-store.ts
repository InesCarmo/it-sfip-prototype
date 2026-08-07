import type { StorageAdapter } from "@/lib/sfip-state-store";
import type { PipelineMode } from "@/lib/funding-tenders-pipeline";

export const FUNDING_TENDERS_PIPELINE_KEY = "it-sfip:funding-tenders-pilot:v1";

export type FundingTendersPipelineDecision = "approved" | "review" | "hold";

export type FundingTendersPipelinePublication = {
  itemId: string;
  name: string;
  confidence: number;
  publishedAt: string;
  mode: PipelineMode;
};

export type StoredFundingTendersPipelineState = {
  version: 1;
  savedAt: string;
  mode: PipelineMode;
  selectedId: string | null;
  approvals: Record<string, FundingTendersPipelineDecision>;
  notes: Record<string, string>;
  published: FundingTendersPipelinePublication[];
  lastRunAt: string | null;
};

export function saveFundingTendersPipelineState(
  storage: StorageAdapter,
  state: Omit<StoredFundingTendersPipelineState, "version" | "savedAt">,
) {
  const snapshot: StoredFundingTendersPipelineState = {
    ...state,
    version: 1,
    savedAt: new Date().toISOString(),
  };
  storage.setItem(FUNDING_TENDERS_PIPELINE_KEY, JSON.stringify(snapshot));
  return snapshot;
}

export function loadFundingTendersPipelineState(storage: StorageAdapter): StoredFundingTendersPipelineState | null {
  const serialized = storage.getItem(FUNDING_TENDERS_PIPELINE_KEY);
  if (!serialized) return null;
  try {
    const state = JSON.parse(serialized) as StoredFundingTendersPipelineState;
    if (
      state.version !== 1 ||
      !state.approvals ||
      !state.notes ||
      !Array.isArray(state.published) ||
      (state.mode !== "dry-run" && state.mode !== "apply")
    ) {
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function clearFundingTendersPipelineState(storage: StorageAdapter) {
  storage.removeItem(FUNDING_TENDERS_PIPELINE_KEY);
}

