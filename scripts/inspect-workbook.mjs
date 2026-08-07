import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const source = process.argv[2];
if (!source) throw new Error("Workbook path is required");

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(source));
const overview = await workbook.inspect({
  kind: process.argv[3] ?? "sheet",
  include: "id,name,range",
  maxChars: 30000,
});

process.stdout.write(overview.ndjson);
