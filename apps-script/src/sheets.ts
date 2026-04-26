interface ExpenseEntry {
  date: string;        // MM/DD/YYYY
  description: string;
  amount: number;
  category: string;
  payment: string;
  tag?: string;
  receiptUrl?: string;
  needsVerification?: boolean;
}

interface SavedEntry extends ExpenseEntry {
  rowId: number;
}

function addEntry(entry: ExpenseEntry, date: Date): SavedEntry {
  const sheetId = getCashSheetID(date);
  const ss = SpreadsheetApp.openById(sheetId);
  const detail = ss.getSheetByName('Detail');
  if (!detail) throw new Error("'Detail' tab not found");

  const insertRow = findFirstDateRow(detail);
  detail.insertRowBefore(insertRow);

  const description = entry.receiptUrl
    ? `=HYPERLINK("${entry.receiptUrl}","${entry.description.replace(/"/g, '""')}")`
    : entry.description;

  detail.getRange(insertRow, 1, 1, 7).setValues([[
    entry.date,
    description,
    entry.amount,
    entry.category,
    entry.payment,
    entry.tag || '',
    entry.needsVerification ? 'yes' : '',
  ]]);

  ensureBlankRowsAtBottom(detail);
  return { ...entry, rowId: insertRow };
}

function updateEntry(rowId: number, entry: Partial<ExpenseEntry>, date: Date): SavedEntry {
  const sheetId = getCashSheetID(date);
  const ss = SpreadsheetApp.openById(sheetId);
  const detail = ss.getSheetByName('Detail');
  if (!detail) throw new Error("'Detail' tab not found");

  const row = detail.getRange(rowId, 1, 1, 7).getValues()[0];

  const updated: ExpenseEntry = {
    date:        entry.date               ?? String(row[0]),
    description: entry.description        ?? String(row[1]),
    amount:      entry.amount             ?? Number(row[2]),
    category:    entry.category           ?? String(row[3]),
    payment:     entry.payment            ?? String(row[4]),
    tag:         entry.tag                ?? String(row[5]),
    needsVerification: entry.needsVerification ?? (row[6] === 'yes'),
    receiptUrl:  entry.receiptUrl,
  };

  const description = updated.receiptUrl
    ? `=HYPERLINK("${updated.receiptUrl}","${updated.description.replace(/"/g, '""')}")`
    : updated.description;

  detail.getRange(rowId, 1, 1, 7).setValues([[
    updated.date,
    description,
    updated.amount,
    updated.category,
    updated.payment,
    updated.tag || '',
    updated.needsVerification ? 'yes' : '',
  ]]);

  return { ...updated, rowId };
}

function deleteEntry(rowId: number, date: Date): void {
  const sheetId = getCashSheetID(date);
  const ss = SpreadsheetApp.openById(sheetId);
  const detail = ss.getSheetByName('Detail');
  if (!detail) throw new Error("'Detail' tab not found");
  detail.deleteRow(rowId);
}

function findFirstDateRow(sheet: GoogleAppsScript.Spreadsheet.Sheet): number {
  const lastRow = sheet.getLastRow() || 1;
  const values = sheet.getRange(1, 1, lastRow, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    const cell = values[i][0];
    if (cell instanceof Date || (typeof cell === 'string' && /\d{1,2}\/\d{1,2}\/\d{4}/.test(cell))) {
      return i + 1;
    }
  }
  return lastRow + 1;
}

function ensureBlankRowsAtBottom(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  const lastRow = sheet.getLastRow();
  const maxRow = sheet.getMaxRows();
  const blanks = maxRow - lastRow;
  if (blanks < 5) sheet.insertRowsAfter(lastRow, 5 - blanks);
}
