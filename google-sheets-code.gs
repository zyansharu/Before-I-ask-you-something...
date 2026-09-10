const SHEET_NAME = 'Sessions';
const HEADERS = ['timestamp', 'sessionId', 'device', 'clickedItems', 'selectedAnswers', 'finalSubmission', 'suggestionText'];

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

  const sessionId = event.sessionId || Utilities.getUuid();
  const timestamp = event.timestamp || new Date().toISOString();
  const device = event.device || 'Unknown';
  const clickedItem = getClickedItem_(event);
  const selectedAnswer = getSelectedAnswer_(event);
  const suggestionText = getSuggestionText_(event);
  const finalSubmission = event.eventType === 'whatsapp_message_click' ? 'Submitted' : '';

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sessionRow = findSessionRow_(sheet, sessionId);
    if (sessionRow) {
      const current = sheet.getRange(sessionRow, 1, 1, HEADERS.length).getValues()[0];
      if (clickedItem) current[3] = appendValue_(current[3], clickedItem);
      if (selectedAnswer) current[4] = appendValue_(current[4], selectedAnswer);
      if (finalSubmission) current[5] = finalSubmission;
      if (suggestionText) current[6] = suggestionText;
      sheet.getRange(sessionRow, 1, 1, HEADERS.length).setValues([current]);
    } else {
      sheet.appendRow([
        timestamp,
        sessionId,
        device,
        clickedItem,
        selectedAnswer,
        finalSubmission,
        suggestionText
      ]);
    }
  } finally {
    lock.releaseLock();
  }

  return json_({ ok: true });
}

function findSessionRow_(sheet, sessionId) {
  if (sheet.getLastRow() < 2) return 0;
  const sessionIds = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
  const index = sessionIds.findIndex((row) => String(row[0]) === String(sessionId));
  return index === -1 ? 0 : index + 2;
}

function appendValue_(current, next) {
  return current ? `${current} | ${next}` : next;
}

function getClickedItem_(event) {
  const clickEvents = ['public_click', 'no_click', 'yes_click', 'continue_click', 'next_question_click', 'date_continue', 'plan_locked', 'whatsapp_message_click'];
  if (!clickEvents.includes(event.eventType)) return '';
  if (event.eventType === 'public_click' && event.elementTag === 'BUTTON') return '';
  return event.buttonText || event.optionText || event.elementLabel || event.eventType;
}

function getSelectedAnswer_(event) {
  if (event.eventType === 'question_option_selected') {
    return `${event.currentStep || event.activeStep || 'Question'}: ${event.optionText || ''}`;
  }
  if (event.eventType === 'plan_option_selected') {
    return `Plan: ${event.optionText || event.selectedPlan || ''}`;
  }
  return '';
}

function getSuggestionText_(event) {
  if (!['suggestion_typing', 'suggestion_submit'].includes(event.eventType)) return '';
  return event.suggestionText || event.typedText || '';
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
  } else {
    const existingHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
    HEADERS.forEach((header) => {
      if (!existingHeaders.includes(header)) sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
    });
  }
  return sheet;
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
