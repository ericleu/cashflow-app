interface ReceiptData {
  date: string | null;
  description: string | null;
  amount: number | null;
  suggestedCategory: string | null;
}

const RECEIPT_PROMPT_PREFIX = `You are parsing a receipt image for an expense tracking app.
Extract the following and return ONLY valid JSON, no other text:

{
  "date": "MM/DD/YYYY",
  "description": "merchant name",
  "amount": 47.23,
  "suggestedCategory": "食 - Groceries"
}

Match suggestedCategory to the closest item from this list:
`;

const RECEIPT_PROMPT_SUFFIX = `

If you cannot read a field clearly, return null for that field.
Do not guess the payment method — always return null for payment.
Return only the JSON object, no markdown, no explanation.`;

function extractReceiptWithClaude(base64Image: string, mimeType: string, categories: string[]): ReceiptData {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in Script Properties');

  const prompt = RECEIPT_PROMPT_PREFIX + categories.join(', ') + RECEIPT_PROMPT_SUFFIX;

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
