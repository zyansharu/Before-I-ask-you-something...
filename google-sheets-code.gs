const SHEET_NAME = 'Submissions';
const HEADERS = [
  'id',
  'timestamp',
  'sessionId',
  'eventType',
  'activeStep',
  'optionText',
  'typedText',
  'selectedDate',
  'selectedPlan',
  'buttonText',
  'messageText',
  'elementTag',
  'elementId',
  'elementText',
  'elementValue',
  'elementLabel',
  'formId',
  'formName',
  'formAction',
  'formMethod',
  'clickX',
  'clickY',
  'targetPath',
  'rawEvent'
];

function authorize() {
  getSheet_();
}

function doPost(e) {
  const sheet = getSheet_();
  let event = {};
  try {
    event = JSON.parse(e.postData.contents || '{}');
  } catch (err) {
    event = {};
  }

  const row = HEADERS.map((header) => {
    if (header === 'id') return event.id || Utilities.getUuid();
    if (header === 'timestamp') return event.timestamp || new Date().toISOString();
    if (header === 'rawEvent') return JSON.stringify(event);
    return event[header] ?? '';
  });

  sheet.appendRow(row);
  return json_({ ok: true });
}

function doGet() {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  if (!values.length) {
    return json_({ ok: true, entries: [] });
  }

  const headers = values[0];
  const entries = values.slice(1).map((row) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = row[index] ?? '';
    });
    return entry;
  });

  return json_({ ok: true, entries });
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById('1Tlap7E5OzqzUBN9Mb4eawPy08zsvv9MoswF_7W-ckVk');
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
