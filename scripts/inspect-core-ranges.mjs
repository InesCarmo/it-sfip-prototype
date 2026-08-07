import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(process.argv[2]));
const targets = [
  ["📋 CALLS", "A1:AW5"],
  ["👥 INVESTIGADORES", "A1:R5"],
  ["🎯 MATCHING", "A1:AI5"],
  ["MATCHING", "A1:K5"],
  ["🔭 RADAR", "A1:V5"],
];

for (const [sheetName, range] of targets) {
  const sheet = workbook.worksheets.getItem(sheetName);
  process.stdout.write(`${JSON.stringify({ sheet: sheetName, range, values: sheet.getRange(range).values })}\n`);
}
