export type UUID = string;
export type ISODate = string;
export type ISODateTime = string;

export type EntityRef = {
  id: UUID;
  name: string;
};

export type FundingSourceRef = EntityRef & {
  category: "Funding Program" | "Radar" | "Event" | "Company Ecosystem" | "Institution";
};

export type CallState = "open" | "planned" | "closed" | "radar";
export type RadarState = "monitoring" | "review" | "stale" | "promoted";
export type WorkspaceStatus = "active" | "archived" | "closed";
export type CampaignStatus = "draft" | "review" | "scheduled" | "sent" | "archived";
export type HistoryEventType =
  | "created"
  | "updated"
  | "published"
  | "imported"
  | "approved"
  | "rejected"
  | "commented"
  | "status_changed"
  | "calculated";

export type FundingProgram = {
  id: UUID;
  sourceId: UUID;
  officialName: string;
  acronym?: string;
  parentProgram?: string;
  domain?: string;
  officialUrl: string;
  coverage: string;
  monitoringPriority: "high" | "medium" | "low";
};

export type CallOfficialData = {
  id: UUID;
  sourceId: UUID;
  programId: UUID;
  officialCode: string;
  officialTitle: string;
  entity: EntityRef;
  type: string;
  level: string;
  areaPrimary: string;
  areaSecondary?: string;
  thematicKeywords: string[];
  targetGroups: string[];
  eligibility: {
    consortiumRequired: boolean;
    companyRequired: boolean;
    minPartners?: number | null;
    minCountries?: number | null;
    ttrl?: string | null;
    geography?: string[];
    duration?: string | null;
    budget?: number | null;
    maxPerProject?: number | null;
    fundingRate?: number | null;
  };
  dates: {
    openedAt?: ISODate | null;
    deadlineAt?: ISODate | null;
    lastVerifiedAt?: ISODate | null;
  };
  links: {
    official: string;
    documentation?: string[];
  };
  status: CallState;
  sourcePriority: number;
  notes?: string;
  rawImportId?: UUID;
};

export type CallIntelligence = {
  callId: UUID;
  stateComputed: CallState;
  daysRemaining?: number | null;
  urgencyScore: number;
  relevanceScore: number;
  potentialIt: string;
  areaStrategicIt: string;
  groupsIt: string[];
  researchersSuggested: UUID[];
  partnerNeeds: string[];
  communicationTags: string[];
  radarDecision?: "keep" | "promote" | "archive";
  explainWhy: string;
  validatedBy?: string;
  validatedAt?: ISODateTime;
  confidence: number;
};

export type RadarItem = {
  id: UUID;
  sourceId: UUID;
  title: string;
  programId?: UUID | null;
  theme: string;
  groupHints: string[];
  status: RadarState;
  nextReviewAt?: ISODate | null;
  deadlineForecastAt?: ISODate | null;
  officialUrl?: string | null;
  notes?: string;
  confidence: number;
};

export type EventItem = {
  id: UUID;
  sourceId: UUID;
  title: string;
  programId?: UUID | null;
  type: "webinar" | "info day" | "brokerage" | "training" | "partner search" | "other";
  startsAt?: ISODate | null;
  endsAt?: ISODate | null;
  registrationDeadlineAt?: ISODate | null;
  audience: string[];
  officialUrl: string;
  notes?: string;
};

export type CompanyItem = {
  id: UUID;
  name: string;
  country?: string;
  sectorTags: string[];
  capabilities: string[];
  contactHints?: string[];
  sourceRefs: string[];
  notes?: string;
};

export type InstitutionItem = {
  id: UUID;
  name: string;
  kind: "funding agency" | "national contact point" | "research organization" | "company" | "other";
  country?: string;
  officialUrl?: string;
  sourceRefs: string[];
};

export type ResearcherItem = {
  id: UUID;
  name: string;
  groupId: UUID;
  institutionId: UUID;
  profileUrl?: string;
  orcid?: string;
  cienciaId?: string;
  expertiseTags: string[];
  keywords: string[];
  active: boolean;
  lastVerifiedAt?: ISODate | null;
};

export type WorkspaceIdea = {
  id: UUID;
  title: string;
  summary: string;
  origin: "email" | "meeting" | "company_visit" | "opportunity" | "internal" | "other";
  status: "active" | "paused" | "converted" | "closed";
  owner: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  relatedEntities: {
    calls: UUID[];
    radar: UUID[];
    companies: UUID[];
    researchers: UUID[];
    institutions: UUID[];
  };
  context: {
    domainTags: string[];
    strategicArea?: string;
    maturity?: string;
    partnerNeeds: string[];
  };
};

export type CampaignItem = {
  id: UUID;
  workspaceId?: UUID | null;
  title: string;
  channel: "email" | "newsletter" | "teams" | "linkedin";
  audience: {
    groups: string[];
    researchers: UUID[];
    companies: UUID[];
    programs: UUID[];
    opportunityTypes: string[];
    states: CallState[];
    areas: string[];
  };
  selectedOpportunityIds: UUID[];
  status: CampaignStatus;
  createdAt: ISODateTime;
  scheduledAt?: ISODateTime | null;
  sentAt?: ISODateTime | null;
  createdBy: string;
  notes?: string;
};

export type HistoryRecord = {
  id: UUID;
  entityType: "call" | "radar" | "event" | "company" | "institution" | "workspace" | "campaign" | "researcher";
  entityId: UUID;
  eventType: HistoryEventType;
  changedAt: ISODateTime;
  changedBy: string;
  field?: string;
  before?: string | number | boolean | null;
  after?: string | number | boolean | null;
  sourceId?: UUID;
  confidence?: number;
  note?: string;
};

export type KnowledgeIndexEntry = {
  id: UUID;
  entityType: "call" | "radar" | "event" | "company" | "institution" | "workspace" | "campaign" | "researcher";
  entityId: UUID;
  title: string;
  tokens: string[];
  programId?: UUID | null;
  sourceId: UUID;
  searchableText: string;
  lastIndexedAt: ISODateTime;
};

export type SfipDataModel = {
  sources: FundingSourceRef[];
  programs: FundingProgram[];
  calls: CallOfficialData[];
  callIntelligence: CallIntelligence[];
  radar: RadarItem[];
  events: EventItem[];
  companies: CompanyItem[];
  institutions: InstitutionItem[];
  researchers: ResearcherItem[];
  workspaces: WorkspaceIdea[];
  campaigns: CampaignItem[];
  history: HistoryRecord[];
  knowledgeIndex: KnowledgeIndexEntry[];
};

export const sfipCollections = [
  "sources",
  "programs",
  "calls",
  "callIntelligence",
  "radar",
  "events",
  "companies",
  "institutions",
  "researchers",
  "workspaces",
  "campaigns",
  "history",
  "knowledgeIndex",
] as const;

export function isCallOpen(state: CallState) {
  return state === "open" || state === "planned";
}

export function isOpportunityVisible(state: CallState | RadarState) {
  return state !== "closed" && state !== "stale";
}

