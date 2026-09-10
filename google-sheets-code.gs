const SHEET_NAME = 'Submissions';
const HEADERS = ['id', 'timestamp', 'sessionId', 'eventType', 'activeStep', 'optionText', 'typedText', 'selectedDate', 'selectedPlan', 'buttonText', 'messageText', 'rawEvent'];

function doPost(e) {
  const sheet = getSheet_();
  const event = JSON.parse(e.postData.contents || '{}');
  const row = HEADERS.map((header) => header === 'rawEvent' ? JSON.stringify(event) : event[header] || '');
  sheet.appendRow(row);
  return json_({ ok: true });
}

function doGet() {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values.shift() || HEADERS;
  const entries = values.map((row) => headers.reduce((entry, header, index) => {
    entry[header] = row[index] || '';
    return entry;
  }, {}));
  return json_({ ok: true, entries });
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById('1Tlap7E5OzqzUBN9Mb4eawPy08zsvv9MoswF_7W-ckVk');
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  return sheet;
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}