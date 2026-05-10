interface Dropdowns {
  categories: string[];
  payments: string[];
  tags: string[];
}

function getDropdowns(date: Date): Dropdowns {
  const sheetId = getCashSheetID(date);
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheetByName('drop down list');
  if (!sheet) throw new Error("'drop down list' tab not found");

  const data = sheet.getDataRange().getValues();

  const categories: string[] = [];
  const payments: string[] = [];
  const tags: string[] = [];

  for (const row of data) {
    if (row[0] && String(row[0]).trim()) categories.push(String(row[0]).trim());
    if (row[1] && String(row[1]).trim()) payments.push(String(row[1]).trim());
    if (row[2] && String(row[2]).trim()) tags.push(String(row[2]).trim());
  }

  return { categories, payments, tags };
}

function getCardMap(date: Date): string[] {
  const sheetId = getCashSheetID(date);
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheetByName('card map');
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const mappings: string[] = [];

  for (const row of data) {
    const digits = row[0] ? String(row[0]).trim() : '';
    const payment = row[1] ? String(row[1]).trim() : '';
    if (digits && payment) {
      mappings.push(`card ending in ${digits} → "${payment}"`);
    }
  }

  return mappings;
}

function getAIRules(date: Date): string[] {
  const sheetId = getCashSheetID(date);
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheetByName('AI rules');
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const rules: string[] = [];

  for (const row of data) {
    const condition   = row[0] ? String(row[0]).trim() : '';
    const instruction = row[1] ? String(row[1]).trim() : '';
    if (condition && instruction) {
      rules.push(`If ${condition}: ${instruction}`);
    }
  }

  return rules;
}
