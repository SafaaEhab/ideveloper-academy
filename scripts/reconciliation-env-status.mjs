/**
 * READ-ONLY env presence check. Prints only variable names / booleans.
 */
import "dotenv/config";
import { whatsappConfigStatus } from "../server/whatsappCloud";
import { googleSheetsStatus } from "../server/googleSheets";

const wa = whatsappConfigStatus();
const sheets = googleSheetsStatus();
const names = [
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_BUSINESS_ACCOUNT_ID",
  "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
  "WHATSAPP_APP_SECRET",
  "WHATSAPP_API_VERSION",
  "GOOGLE_SHEETS_ENABLED",
  "GOOGLE_SHEETS_SHEET_NAME",
  "GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_SHEETS_PRIVATE_KEY",
  "GOOGLE_SHEETS_SPREADSHEET_ID",
];
console.log(JSON.stringify({
  localProcessPresence: Object.fromEntries(
    names.map(name => [name, Boolean(process.env[name])]),
  ),
  whatsapp: {
    configured: wa.configured,
    missing: wa.missing,
    apiVersion: wa.apiVersion,
  },
  googleSheets: {
    configured: sheets.configured,
    enabled: sheets.enabled,
    missing: sheets.missing,
    sheetName: sheets.sheetName,
    serviceAccountEmailPresent: Boolean(sheets.serviceAccountEmail),
    spreadsheetIdPresent: Boolean(sheets.spreadsheetId),
  },
}, null, 2));
