const { google } = require('googleapis');
const { getOptionalEnv } = require('../config/env');

function getSheetsConfig() {
  const privateKey = getOptionalEnv('GOOGLE_SHEETS_PRIVATE_KEY', '');
  const clientEmail = getOptionalEnv('GOOGLE_SHEETS_CLIENT_EMAIL', '');
  const spreadsheetId = getOptionalEnv('GOOGLE_SHEETS_SPREADSHEET_ID', '');
  return { privateKey, clientEmail, spreadsheetId };
}

function isSheetsConfigured() {
  const { privateKey, clientEmail, spreadsheetId } = getSheetsConfig();
  return Boolean(privateKey && clientEmail && spreadsheetId);
}

async function getSheetsClient() {
  const { privateKey, clientEmail } = getSheetsConfig();
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  await auth.authorize();
  return google.sheets({ version: 'v4', auth });
}

async function ensureSheetExists(sheets, spreadsheetId, title) {
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = res.data.sheets.find((s) => s.properties.title === title);
  if (existing) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }]
    }
  });
}

async function ensureHeaders(sheets, spreadsheetId, range, headers) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    majorDimension: 'ROWS'
  });
  if (res.data.values && res.data.values.length > 0) return;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [headers] }
  });
}

async function appendRow(sheets, spreadsheetId, range, values) {
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] }
  });
}

const INVOICE_HEADERS = ['Дата', 'Постачальник', 'Заклад', 'Номер накладної', 'Всього позицій', 'Проскановано', 'Статус'];
const ITEMS_HEADERS = ['Дата', 'ID накладної', 'Товар', 'Кількість', 'Од.', 'ШК акцизу', 'Статус'];
const INVOICE_SHEET = 'Накладні';
const ITEMS_SHEET = 'Позиції';

async function initSheets() {
  if (!isSheetsConfigured()) {
    console.warn('[sheets] Google Sheets not configured. Invoice data will not be saved.');
    return;
  }
  const sheets = await getSheetsClient();
  const { spreadsheetId } = getSheetsConfig();
  await ensureSheetExists(sheets, spreadsheetId, INVOICE_SHEET);
  await ensureSheetExists(sheets, spreadsheetId, ITEMS_SHEET);
  await ensureHeaders(sheets, spreadsheetId, `${INVOICE_SHEET}!A1`, INVOICE_HEADERS);
  await ensureHeaders(sheets, spreadsheetId, `${ITEMS_SHEET}!A1`, ITEMS_HEADERS);
  console.log('[sheets] Ready');
}

async function saveInvoice(supplier, venue, invoiceNumber, items) {
  if (!isSheetsConfigured()) return;
  const sheets = await getSheetsClient();
  const { spreadsheetId } = getSheetsConfig();
  const now = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' });
  const invoiceId = invoiceNumber || `INV-${Date.now()}`;
  const scannedCount = items.filter((i) => i.barcode).length;

  await appendRow(sheets, spreadsheetId, `${INVOICE_SHEET}!A:G`, [
    venue, '', '', '', '', '', ''
  ]);
  await appendRow(sheets, spreadsheetId, `${INVOICE_SHEET}!A:G`, [
    now, supplier, venue, invoiceId, items.length, scannedCount, scannedCount === items.length ? 'Повністю' : 'Частково'
  ]);

  await appendRow(sheets, spreadsheetId, `${ITEMS_SHEET}!A:G`, [
    `${venue} — ${invoiceId}`, '', '', '', '', '', ''
  ]);
  for (const item of items) {
    await appendRow(sheets, spreadsheetId, `${ITEMS_SHEET}!A:G`, [
      now, invoiceId, item.name, item.quantity, item.unit, item.barcode || '', item.barcode ? 'Проскановано' : 'Пропущено'
    ]);
  }
}

module.exports = { initSheets, saveInvoice, isSheetsConfigured };
