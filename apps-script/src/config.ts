function isAuthorized(token: string): boolean {
  const expected = PropertiesService.getScriptProperties().getProperty('AUTH_TOKEN');
  return !!expected && token === expected;
}

function corsResponse(data: object): GoogleAppsScript.Content.TextOutput {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getCashSheetID(date: Date): string {
  const year = date.getFullYear().toString();
  const props = PropertiesService.getScriptProperties();
  const cacheKey = `sheetId_${year}`;

  const cached = props.getProperty(cacheKey);
  if (cached) return cached;

  const folderId = props.getProperty('CASHFLOW_FOLDER_ID');
  if (!folderId) throw new Error('CASHFLOW_FOLDER_ID not set in Script Properties');

  const rootFolder = DriveApp.getFolderById(folderId);
  const yearFolders = rootFolder.getFoldersByName(year);
  if (!yearFolders.hasNext()) throw new Error(`No folder found for year ${year}`);

  const yearFolder = yearFolders.next();
  const sheets = yearFolder.getFilesByType(MimeType.GOOGLE_SHEETS);
  if (!sheets.hasNext()) throw new Error(`No Google Sheet found in ${year} folder`);

  const sheetId = sheets.next().getId();
  props.setProperty(cacheKey, sheetId);
  return sheetId;
}

// Run manually on Jan 1 or via a time-based trigger.
function createNewYearSetup(year: number): void {
  const props = PropertiesService.getScriptProperties();
  const folderId = props.getProperty('CASHFLOW_FOLDER_ID');
  if (!folderId) throw new Error('CASHFLOW_FOLDER_ID not set in Script Properties');

  const rootFolder = DriveApp.getFolderById(folderId);
  const prevYear = (year - 1).toString();
  const newYear = year.toString();

  const prevFolders = rootFolder.getFoldersByName(prevYear);
  if (!prevFolders.hasNext()) throw new Error(`Previous year folder ${prevYear} not found`);
  const prevFolder = prevFolders.next();

  const prevSheets = prevFolder.getFilesByType(MimeType.GOOGLE_SHEETS);
  if (!prevSheets.hasNext()) throw new Error(`No sheet found in ${prevYear} folder`);
  const prevSheet = prevSheets.next();

  const newFolder = rootFolder.createFolder(newYear);
  const newFile = prevSheet.makeCopy(`${newYear} Cash Flow`, newFolder);
  newFolder.createFolder('receipts');

  // Clear Detail entries while preserving top placeholder rows
  const ss = SpreadsheetApp.openById(newFile.getId());
  const detail = ss.getSheetByName('Detail');
  if (detail) {
    const firstDateRow = findFirstDateRow(detail);
    const lastRow = detail.getLastRow();
    if (firstDateRow > 0 && lastRow >= firstDateRow) {
      detail.deleteRows(firstDateRow, lastRow - firstDateRow + 1);
    }
  }

  Logger.log(`Created ${newYear} folder and sheet successfully`);
}
