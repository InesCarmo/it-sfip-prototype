import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const source = process.argv[2] ?? process.env.SFIP_WORKBOOK ?? path.resolve("../outputs/v1.5_dashboard_otimizado/Ferramenta_Gestao_Oportunidades_Financiamento_2026_2027_V1.5_Dashboard_Otimizado.xlsx");
const output = process.argv[3] ?? path.resolve("data/core-data.json");

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(source));

function repairText(value) {
  if (typeof value !== "string" || !/[ÃÂâð]/.test(value)) return value;
  try {
    const bytes = Uint8Array.from([...value].map(character => character.charCodeAt(0)));
    const repaired = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return repaired.includes("�") ? value : repaired;
  } catch {
    return value;
  }
}

function excelDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value !== "number" || !Number.isFinite(value) || value < 20000 || value > 80000) return value;
  return new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000).toISOString().slice(0, 10);
}

function rowsFromRange(sheetName, range, headerRow = 0, startRow = headerRow + 1) {
  const values = workbook.worksheets.getItem(sheetName).getRange(range).values;
  const headers = values[headerRow].map((value, index) => repairText(String(value ?? `Column ${index + 1}`).trim()));
  return values.slice(startRow).filter(row => row.some(value => value !== null && value !== "")).map(row =>
    Object.fromEntries(headers.map((header, index) => [header, repairText(row[index] ?? null)]))
  );
}

const calls = rowsFromRange("📋 CALLS", "A1:AW99").map(call => ({
  ...call,
  "Data Abertura": excelDate(call["Data Abertura"]),
  Deadline: excelDate(call.Deadline),
  "Última Verificação": excelDate(call["Última Verificação"]),
  "Dias Restantes": null,
}));

const researchers = rowsFromRange("👥 INVESTIGADORES", "A1:R23").map(person => ({
  ...person,
  "Última Verificação": excelDate(person["Última Verificação"]),
}));

const matching = rowsFromRange("🎯 MATCHING", "A1:S158", 3, 4).filter(row => row["Call ID"] && row["Investigador ID"]);
const legacyMatching = rowsFromRange("MATCHING", "A1:K48").filter(row => row["ID Call"]);
const radar = rowsFromRange("🔭 RADAR", "A1:V25").map(item => ({
  ...item,
  "Abertura Prevista": excelDate(item["Abertura Prevista"]),
  "Deadline Prevista": excelDate(item["Deadline Prevista"]),
  "Última Verificação": excelDate(item["Última Verificação"]),
  "Próxima Verificação": excelDate(item["Próxima Verificação"]),
}));

const payload = {
  meta: {
    sourceWorkbook: path.basename(source),
    generatedAt: new Date().toISOString(),
    counts: { calls: calls.length, researchers: researchers.length, matching: matching.length, legacyMatching: legacyMatching.length, radar: radar.length },
  },
  calls,
  researchers,
  matching,
  legacyMatching,
  radar,
};

await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(payload.meta)}\n`);
