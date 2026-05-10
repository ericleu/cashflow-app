interface LineItem {
  description: string | null;
  amount: number | null;
  suggestedCategory: string | null;
}

interface ReceiptData {
  date: string | null;
  description: string | null;
  totalAmount: number | null;
  suggestedPayment: string | null;
  items: LineItem[];
}

const RECEIPT_PROMPT_PREFIX = `You are parsing a receipt image for an expense tracking app.
Extract the following and return ONLY valid JSON, no other text:

{
  "date": "MM/DD/YYYY",
  "description": "merchant name",
  "totalAmount": 47.23,
  "suggestedPayment": "Zelle",
  "items": [
    { "description": "item group description", "amount": 47.23, "suggestedCategory": "食 - Groceries" }
  ]
}

SPLITTING RULES — follow strictly:
- Default to ONE item containing the full totalAmount
- Only split into multiple items when it is clearly and unambiguously obvious that the receipt has separate amounts belonging to DIFFERENT expense categories (e.g. a membership fee line explicitly listed alongside grocery items)
- When in doubt, do NOT split — return a single item
- Item amounts must sum exactly to totalAmount
- Apply mandatory override rules (see below) per item when the condition matches

Match each item's suggestedCategory to the closest from this list (mandatory override rules below take priority):
`;

const RECEIPT_PROMPT_PAYMENTS_PREFIX = `

Match suggestedPayment to the closest item from this list if the payment method is visible on the receipt:
`;

const RECEIPT_PROMPT_SUFFIX = `

If you cannot read a field clearly, return null for that field.
Item amounts must sum exactly to totalAmount.
Only set suggestedPayment if the payment method is clearly visible on the receipt — otherwise return null.
Return only the JSON object, no markdown, no explanation.`;

function extractReceiptWithClaude(base64Image: string, mimeType: string, categories: string[], payments: string[], rules: string[], cardMap: string[]): ReceiptData {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in Script Properties');

  const cardMapBlock = cardMap.length > 0
    ? `\n\nCard mapping (use these to identify payment method from last 4 digits):\n${cardMap.map(m => `- ${m}`).join('\n')}`
    : '';

  const rulesBlock = rules.length > 0
    ? `\n\nMANDATORY RULES — Follow these exactly when the condition matches. They take strict priority over everything above:\n${rules.map(r => `- ${r}`).join('\n')}`
    : '';

  const prompt = RECEIPT_PROMPT_PREFIX + categories.join(', ')
    + RECEIPT_PROMPT_PAYMENTS_PREFIX + payments.join(', ')
    + cardMapBlock
    + rulesBlock
    + RECEIPT_PROMPT_SUFFIX;

  const response = UrlFetchApp.fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({
        contents: [{ parts: [
          { inline_data: { mime_type: mimeType, data: base64Image } },
          { text: prompt },
        ]}],
        generationConfig: { temperature: 0 },
      }),
      muteHttpExceptions: true,
    }
  );

  const status = response.getResponseCode();
  if (status !== 200) {
    throw new Error(`Gemini API error ${status}: ${response.getContentText()}`);
  }

  const body = JSON.parse(response.getContentText());
  const text = body.candidates[0].content.parts[0].text.trim()
    .replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(text) as ReceiptData;
}
