import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const catalogPath = path.join(root, "data", "sfip-official-source-catalog.json");
const manifestPath = path.join(root, "data", "source_manifest.json");

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

const profiles = {
  funding_open_call: [
    "Official title",
    "Official code",
    "Programme",
    "Entity",
    "State",
    "Opening date",
    "Deadline",
    "Type",
    "Area",
    "Objectives",
    "Beneficiaries",
    "Consortium",
    "Funding amount",
    "Funding rate",
    "Duration",
    "Link",
    "Verification source",
    "Last verified"
  ],
  funding_erc: [
    "Official title",
    "Official code",
    "Programme",
    "State",
    "Opening date",
    "Deadline",
    "PhD window / eligibility",
    "Base funding",
    "Additional funding",
    "Duration",
    "Link",
    "Verification source",
    "Last verified"
  ],
  radar_forecast: [
    "Forecast title",
    "Programme",
    "Forecast state",
    "Planned window",
    "Indicative budget",
    "Link",
    "Verification source",
    "Last verified"
  ],
  event_info: [
    "Event title",
    "Date",
    "Time",
    "Associated call",
    "Audience",
    "Registration link",
    "Materials",
    "Link",
    "Verification source",
    "Last verified"
  ],
  company_ecosystem: [
    "Company / organisation",
    "Programme",
    "State",
    "Opportunity",
    "Partner need",
    "Relevant group",
    "Potential role",
    "Link",
    "Verification source",
    "Last verified"
  ],
  institution_reference: [
    "Institution",
    "Programme",
    "Reference page",
    "Rule / guidance",
    "Link",
    "Verification source",
    "Last verified"
  ],
  networking_action: [
    "Action title",
    "Code",
    "Programme",
    "State",
    "Opening date",
    "Deadline / cut-off",
    "Type",
    "Duration",
    "Participation form",
    "Link",
    "Verification source",
    "Last verified"
  ]
};

const taskDefaults = {
  discovery: {
    when: "Daily at 05:00 Europe/Lisbon",
    reads: ["catalog", "source_manifest", "raw source snapshots"],
    writes: ["raw_snapshots", "discovery_queue", "change_log"],
    stopConditions: [
      "Source unavailable or blocked",
      "No content change detected",
      "Mandatory metadata missing from the source"
    ],
    humanReview: [
      "New source path or layout change",
      "Ambiguous title/code/deadline",
      "Source returns mixed open and forecast content"
    ]
  },
  validation: {
    when: "Daily at 06:00 Europe/Lisbon",
    reads: ["discovery_queue", "raw_snapshots", "source_manifest"],
    writes: ["validation_queue", "staging_calls", "staging_radar", "staging_events", "validation_log"],
    stopConditions: [
      "Normalized record fails schema validation",
      "Duplicate key already confirmed",
      "Official source does not support the extracted values"
    ],
    humanReview: [
      "Funding or deadline inferred rather than explicit",
      "Conflicting official sources",
      "Confidence below threshold"
    ]
  },
  enrichment: {
    when: "Daily at 06:30 Europe/Lisbon",
    reads: ["staging_calls", "staging_radar", "tblInvestigadores", "tblMatching", "tblRadar"],
    writes: ["enriched_calls", "enriched_radar", "enriched_events", "enriched_companies", "enrichment_log"],
    stopConditions: [
      "No validated items to enrich",
      "Reference data unavailable",
      "Matching score below minimum confidence"
    ],
    humanReview: [
      "Group or investigator match is only indicative",
      "Communication audience is incomplete",
      "Opportunity could fit multiple modules with equal score"
    ]
  },
  publication: {
    when: "Daily at 07:00 Europe/Lisbon and on-demand after review approval",
    reads: ["enriched_calls", "enriched_radar", "enriched_events", "enriched_companies", "approval_queue"],
    writes: ["tblCalls", "tblRadar", "tblEvents", "tblCompanies", "tblInstitutions", "tblMatching", "tblSourceSnapshots", "tblChangeLog"],
    stopConditions: [
      "Pending human approval for mandatory-review items",
      "Duplicate conflict unresolved",
      "Required destination table unavailable"
    ],
    humanReview: [
      "Any record with approval_required = true",
      "Any record with confidence below source threshold",
      "Any duplicate or state transition from radar to call"
    ]
  }
};

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function categoryMethod(category, name) {
  if (name === "European Commission - Work Programmes / R&I repository") return "PDF";
  if (category === "Webinars & Info Days") return "HTML";
  if (category === "Brokerage & Networking") return "HTML";
  if (category === "Radar Estratégico" && name.includes("repository")) return "PDF";
  return "HTML";
}

function destination(category, name) {
  const map = {
    "FCT - Concursos": ["tblCalls"],
    "Portugal 2030 - Avisos": ["tblCalls"],
    "COMPETE 2030 - Avisos": ["tblCalls"],
    "Centro 2030 - Avisos": ["tblCalls"],
    "Algarve 2030 - STEP": ["tblCalls"],
    "Horizon Europe - Topic Pages": ["tblCalls"],
    "European Research Council - ERC": ["tblCalls"],
    "MSCA - Marie Skłodowska-Curie Actions": ["tblCalls"],
    "Digital Europe / HaDEA": ["tblCalls"],
    "European Innovation Council - EIC": ["tblCalls"],
    "EuroHPC JU": ["tblCalls"],
    "Chips JU / ECS 2026": ["tblCalls"],
    "EEA Grants - Bilateral Fund": ["tblCalls"],
    "Interreg Programmes": ["tblCalls", "tblRadar"],
    "EIT KIC Portals": ["tblCalls", "tblEvents"],
    "COST": ["tblCalls", "tblEvents"],
    "ESA Opportunities": ["tblCalls", "tblRadar"],
    "Eureka Network / Eurostars / Clusters": ["tblCalls"],
    "ANI - Rede Eureka": ["tblInstitutions"],
    "Portugal 2030 - Plano Anual de Avisos": ["tblRadar"],
    "Centro 2030 - Plano Anual de Avisos": ["tblRadar"],
    "European Commission - Work Programmes / R&I repository": ["tblRadar", "tblCalls"],
    "Digital Strategy - Info Sessions": ["tblEvents", "tblRadar"],
    "Digital Strategy - Guidance Library": ["tblEvents", "tblRadar"],
    "COMPETE 2030 - Rede de Fornecedores Inovadores": ["tblCompanies", "tblCalls"],
    "EIC Accelerator": ["tblCalls"],
    "ESA Commercialisation": ["tblCalls", "tblCompanies"],
    "EIT Innovation Uptake / Mobility / Culture": ["tblCalls", "tblEvents"],
    "ANI": ["tblInstitutions"],
    "European Commission": ["tblInstitutions"],
    "Portugal 2030": ["tblInstitutions"],
    "COMPETE 2030": ["tblInstitutions"],
    "FCT": ["tblInstitutions"]
  };
  return map[name] || (category === "Radar Estratégico" ? ["tblRadar"] : ["tblCalls"]);
}

function confidenceLevel(category, name) {
  if (name === "European Commission - Work Programmes / R&I repository") return "medium";
  if (category === "Radar Estratégico") return "medium";
  if (category === "Webinars & Info Days") return "medium";
  if (category === "Instituições") return "medium";
  return "high";
}

function approvalRequired(category, name) {
  if (category === "Webinars & Info Days") return "recommended";
  if (name === "European Commission - Work Programmes / R&I repository") return "recommended";
  return "mandatory";
}

function fieldProfileFor(category, name) {
  if (category === "Radar Estratégico") return "radar_forecast";
  if (category === "Webinars & Info Days") return "event_info";
  if (category === "Empresas & Ecossistema") return "company_ecosystem";
  if (category === "Instituições") return "institution_reference";
  if (name === "European Research Council - ERC") return "funding_erc";
  if (name === "COST") return "networking_action";
  if (name === "ESA Opportunities") return "funding_open_call";
  if (name === "EIT KIC Portals") return "event_info";
  return "funding_open_call";
}

function validationRules(category, name) {
  const base = [
    "official_url_required",
    "normalize_title_program_code",
    "block_non_official_domains",
    "human_review_when_ambiguous"
  ];
  if (category === "Radar Estratégico") base.push("do_not_promote_to_calls_without_official_opening");
  if (category === "Webinars & Info Days") base.push("event_link_and_datetime_required");
  if (category === "Empresas & Ecossistema") base.push("company_entity_presence_required");
  if (category === "Instituições") base.push("reference_only_no_opportunity_autopublish");
  if (name === "European Research Council - ERC") base.push("phd_window_or_poc_eligibility_required");
  if (name.includes("Eureka") || name.includes("Eurostars") || name.includes("Clusters") || name === "ANI - Rede Eureka") base.push("national_mechanism_validation_required");
  return [...new Set(base)];
}

function changeDetection(category, name, method) {
  const signals = ["checksum_or_hash", "normalized_field_diff", "official_url_stability"];
  if (method === "PDF") signals.push("pdf_text_diff");
  if (category === "Radar Estratégico") signals.push("calendar_window_change");
  if (name.includes("Eureka") || name.includes("Eurostars") || name.includes("Clusters")) signals.push("deadline_shift", "phase_change");
  if (name === "COST") signals.push("call_cutoff_change");
  if (category === "Webinars & Info Days") signals.push("event_datetime_change");
  return {
    strategy: method === "PDF" ? "pdf_checksum_and_text_hash" : "normalized_dom_diff",
    signals
  };
}

function dedupPolicy(category, name) {
  if (name.includes("Eureka") || name.includes("Eurostars") || name.includes("Clusters")) {
    return "official_code + normalized_title + programme + deadline + phase";
  }
  if (category === "Radar Estratégico") return "forecast_title + programme + window";
  if (category === "Webinars & Info Days") return "event_title + date + associated_call";
  if (category === "Empresas & Ecossistema") return "company + programme + opportunity";
  if (category === "Instituições") return "institution + reference_page";
  return "official_code + normalized_title + deadline";
}

function buildSource(entry) {
  const method = categoryMethod(entry.category, entry.name);
  const fieldProfile = fieldProfileFor(entry.category, entry.name);
  return {
    source_id: slugify(entry.name),
    name: entry.name,
    official_url: entry.url,
    category: entry.category,
    priority: entry.name === "European Commission - Work Programmes / R&I repository" || entry.category === "Radar Estratégico" ? "high" : (entry.category === "Webinars & Info Days" ? "medium" : (entry.category === "Instituições" ? "high" : "high")),
    execution_frequency: entry.freq,
    acquisition_method: method,
    destination: destination(entry.category, entry.name),
    field_profile: fieldProfile,
    fields_to_extract: profiles[fieldProfile],
    validation_rules: validationRules(entry.category, entry.name),
    change_detection: changeDetection(entry.category, entry.name, method),
    deduplication_policy: dedupPolicy(entry.category, entry.name),
    confidence_level: confidenceLevel(entry.category, entry.name),
    human_approval_required: approvalRequired(entry.category, entry.name)
  };
}

const sources = catalog.categories.flatMap((category) =>
  category.sources.map((source) => buildSource({ ...source, category: category.name }))
);

const manifest = {
  title: "SFIP Source Manifest",
  version: 1,
  generatedAt: new Date().toISOString(),
  sourceCatalogRef: "data/sfip-official-source-catalog.json",
  pipelineStages: ["Discovery", "Validation", "Enrichment", "Publication"],
  fieldProfiles: profiles,
  scheduledTasks: {
    Discovery: {
      when: taskDefaults.discovery.when,
      sources: sources.map((source) => source.source_id),
      reads: taskDefaults.discovery.reads,
      writes: taskDefaults.discovery.writes,
      stopConditions: taskDefaults.discovery.stopConditions,
      humanReviewTriggers: taskDefaults.discovery.humanReview
    },
    Validation: {
      when: taskDefaults.validation.when,
      sources: sources.map((source) => source.source_id),
      reads: taskDefaults.validation.reads,
      writes: taskDefaults.validation.writes,
      stopConditions: taskDefaults.validation.stopConditions,
      humanReviewTriggers: taskDefaults.validation.humanReview
    },
    Enrichment: {
      when: taskDefaults.enrichment.when,
      sources: sources.map((source) => source.source_id),
      reads: taskDefaults.enrichment.reads,
      writes: taskDefaults.enrichment.writes,
      stopConditions: taskDefaults.enrichment.stopConditions,
      humanReviewTriggers: taskDefaults.enrichment.humanReview
    },
    Publication: {
      when: taskDefaults.publication.when,
      sources: sources.map((source) => source.source_id),
      reads: taskDefaults.publication.reads,
      writes: taskDefaults.publication.writes,
      stopConditions: taskDefaults.publication.stopConditions,
      humanReviewTriggers: taskDefaults.publication.humanReview
    }
  },
  sources
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`Wrote ${manifestPath}`);
