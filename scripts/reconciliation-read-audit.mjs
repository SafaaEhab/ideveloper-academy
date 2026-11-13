import fs from "node:fs";
import ExcelJS from "exceljs";

const file = "C:/Users/safaa/Downloads/ideveloper_high_issues (2).xlsx";
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(file);
const lines = [
  `sheets: ${workbook.worksheets.map(sheet => `${sheet.name} (${sheet.rowCount}x${sheet.columnCount})`).join(", ")}`,
];
for (const sheet of workbook.worksheets) {
  lines.push(`\n===== SHEET: ${sheet.name} =====`);
  const max = Math.min(sheet.rowCount, 120);
  for (let rowNumber = 1; rowNumber <= max; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const values = row.values.slice(1).map(value => {
      if (value == null) return "";
      if (typeof value === "object") {
        if (value.text) return String(value.text);
        if (value.result != null) return String(value.result);
        return JSON.stringify(value);
      }
      return String(value);
    });
    if (values.some(Boolean)) {
      lines.push(`${rowNumber}: ${values.join(" | ")}`);
    }
  }
}
const output = lines.join("\n");
fs.writeFileSync("reports/phase2/manager-audit-raw.txt", output, "utf8");
console.log(output.slice(0, 1200));
