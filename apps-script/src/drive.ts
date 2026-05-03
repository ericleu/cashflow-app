function addReceipt(base64Data: string, mimeType: string, date: Date, retries = 3): string {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return addReceiptOnce(base64Data, mimeType, date);
    } catch (e) {
      if (attempt === retries) throw e;
      Utilities.sleep(1000 * attempt);
    }
  }
  throw new Error('addReceipt failed after retries');
}

function addReceiptOnce(base64Data: string, mimeType: string, date: Date): string {
  const sheetId = getCashSheetID(date);
  const receiptsFolderId = getOrCreateReceiptsFolder(sheetId, date);

  const blob = Utilities.newBlob(
    Utilities.base64Decode(base64Data),
    mimeType,
    `receipt_${Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss')}`,
  );

  const folder = DriveApp.getFolderById(receiptsFolderId);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function getOrCreateReceiptsFolder(sheetId: string, date: Date): string {
  const year = date.getFullYear().toString();
  const props = PropertiesService.getScriptProperties();
  const cacheKey = `receiptsFolderId_${year}`;

  const cached = props.getProperty(cacheKey);
  if (cached) return cached;

  const sheetFile = DriveApp.getFileById(sheetId);
  const parents = sheetFile.getParents();
  if (!parents.hasNext()) throw new Error('Sheet has no parent folder');

  const yearFolder = parents.next();
  const existing = yearFolder.getFoldersByName('receipts');

  const receiptFolder = existing.hasNext()
    ? existing.next()
    : yearFolder.createFolder('receipts');

  const folderId = receiptFolder.getId();
  props.setProperty(cacheKey, folderId);
  return folderId;
}
