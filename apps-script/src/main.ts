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
        const receiptData = extractReceiptWithClaude(
          base64Image, mimeType,
          dropdowns.categories, dropdowns.payments,
          getAIRules(date), getCardMap(date),
        );

        const receiptUrl = addReceipt(base64Image, mimeType, date);
        const sharedDate = receiptData.date ?? payload.date;
        const sharedPayment = receiptData.suggestedPayment ?? dropdowns.payments[0] ?? '';

        const merchant = receiptData.description ?? '';

        if (!receiptData.items || receiptData.items.length <= 1) {
          const item = receiptData.items?.[0];
          const entry = addEntry({
            date: sharedDate,
            description: buildDescription(merchant, item?.description ?? ''),
            amount: item?.amount ?? 0,
            category: item?.suggestedCategory ?? '',
            payment: sharedPayment,
            receiptUrl,
            needsVerification: !item?.amount || !item?.suggestedCategory,
          }, date);
          return corsResponse({ ok: true, data: { entry } });
        }

        // Multiple items — reverse so item[0] ends up at the top of the sheet after sequential insertions.
        // Each addEntry calls findFirstDateRow which returns the same row R every time (each save pushes
        // the previous entry down by one), so all returned rowIds equal R. After reversing, we fix rowIds:
        // item[k] is physically at row R+k.
        const saved = [...receiptData.items].reverse().map(item =>
          addEntry({
            date: sharedDate,
            description: buildDescription(merchant, item.description ?? ''),
            amount: item.amount ?? 0,
            category: item.suggestedCategory ?? '',
            payment: sharedPayment,
            receiptUrl,
            needsVerification: !item.amount || !item.suggestedCategory,
          }, date)
        );
        const baseRowId = saved[saved.length - 1].rowId; // items[0] was saved last at row R
        saved.reverse();
        const entries = saved.map((s, i) => ({ ...s, rowId: baseRowId + i }));
        return corsResponse({ ok: true, data: { entries } });
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

// Ensures descriptions always start with the merchant name.
// "Walmart" + "produce" → "Walmart — produce"
// "Walmart" + ""        → "Walmart"
// "Walmart" + "Walmart" → "Walmart"
// ""        + "produce" → "produce"
function buildDescription(merchant: string, item: string): string {
  const m = merchant.trim();
  const d = item.trim();
  if (!m) return d;
  if (!d || d.toLowerCase() === m.toLowerCase()) return m;
  if (d.toLowerCase().startsWith(m.toLowerCase())) return d;
  return `${m} — ${d}`;
}
