function doPost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  try {
    const data = JSON.parse(e.postData.contents);
    const { token, action, payload } = data;

    if (!isAuthorized(token)) {
      return corsResponse({ ok: false, error: 'Unauthorized' });
    }

    const date = payload?.date ? parseDate(payload.date) : new Date();

    switch (action) {
      case 'getDropdowns':
        return corsResponse({ ok: true, data: getDropdowns(date) });

      case 'extractReceipt': {
        const { base64Image, mimeType } = payload;
        const dropdowns = getDropdowns(date);
        const rules = getAIRules(date);
        const receiptData = extractReceiptWithClaude(base64Image, mimeType, dropdowns.categories, rules);

        const allPresent = receiptData.date && receiptData.amount != null && receiptData.suggestedCategory;

        if (allPresent) {
          const receiptUrl = payload.saveReceipt
            ? addReceipt(base64Image, mimeType, date)
            : undefined;

          const entry = addEntry({
            date: receiptData.date!,
            description: receiptData.description || '',
            amount: receiptData.amount!,
            category: receiptData.suggestedCategory!,
            payment: dropdowns.payments[0] ?? '',
            receiptUrl,
          }, date);

          return corsResponse({ ok: true, data: { autoSaved: true, entry } });
        }

        return corsResponse({ ok: true, data: { autoSaved: false, receiptData } });
      }

      case 'addEntry': {
        const { entry: entryPayload, base64Image, mimeType } = payload;
        const receiptUrl = base64Image ? addReceipt(base64Image, mimeType, date) : undefined;
        const saved = addEntry({ ...entryPayload, receiptUrl }, date);
        return corsResponse({ ok: true, data: { entry: saved } });
      }

      case 'updateEntry': {
        const { rowId, entry: entryPayload, base64Image, mimeType } = payload;
        const receiptUrl = base64Image ? addReceipt(base64Image, mimeType, date) : undefined;
        const updated = updateEntry(rowId, { ...entryPayload, receiptUrl }, date);
        return corsResponse({ ok: true, data: { entry: updated } });
      }

      case 'deleteEntry': {
        deleteEntry(payload.rowId, date);
        return corsResponse({ ok: true, data: {} });
      }

      default:
        return corsResponse({ ok: false, error: `Unknown action: ${action}` });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return corsResponse({ ok: false, error: message });
  }
}

function parseDate(dateStr: string): Date {
  const [month, day, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}
