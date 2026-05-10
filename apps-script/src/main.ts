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
        const cardMap = getCardMap(date);
        const receiptData = extractReceiptWithClaude(base64Image, mimeType, dropdowns.categories, dropdowns.payments, rules, cardMap);

        const { items } = receiptData;
        const firstItem = items?.[0];

        if (!items || items.length <= 1) {
          // Single item — existing auto-save logic
          const allPresent = receiptData.date && firstItem?.amount != null && firstItem?.suggestedCategory;
          if (allPresent) {
            const receiptUrl = addReceipt(base64Image, mimeType, date);
            const entry = addEntry({
              date: receiptData.date!,
              description: firstItem.description || receiptData.description || '',
              amount: firstItem.amount!,
              category: firstItem.suggestedCategory!,
              payment: receiptData.suggestedPayment ?? dropdowns.payments[0] ?? '',
              receiptUrl,
            }, date);
            return corsResponse({ ok: true, data: { autoSaved: true, entry } });
          }
          return corsResponse({ ok: true, data: { autoSaved: false, receiptData } });
        }

        // Multiple items — save receipt to Drive, send to frontend for confirmation
        const receiptUrl = addReceipt(base64Image, mimeType, date);
        return corsResponse({ ok: true, data: { autoSaved: false, split: true, receiptData: { ...receiptData, receiptUrl } } });
      }

      case 'addEntry': {
        const { entry: entryPayload, base64Image, mimeType } = payload;
        const receiptUrl = base64Image ? addReceipt(base64Image, mimeType, date) : undefined;
        const saved = addEntry({ ...entryPayload, receiptUrl }, date);
        return corsResponse({ ok: true, data: { entry: saved } });
      }

      case 'addSplitEntries': {
        const { items, shared } = payload;
        const entryDate = parseDate(shared.date);
        // Reverse so that items[0] ends up at the top of the sheet after sequential insertions
        const saved = [...items].reverse().map((item: { description: string; amount: number; category: string }) =>
          addEntry({
            date: shared.date,
            description: item.description,
            amount: item.amount,
            category: item.category,
            payment: shared.payment,
            receiptUrl: shared.receiptUrl,
          }, entryDate)
        );
        saved.reverse(); // restore original order for response
        return corsResponse({ ok: true, data: { entries: saved } });
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
