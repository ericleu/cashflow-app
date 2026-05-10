import { getToken } from './auth';

const SCRIPT_URL = import.meta.env.VITE_SCRIPT_URL as string;

export interface Dropdowns {
  categories: string[];
  payments: string[];
  tags: string[];
}

export interface EntryPayload {
  date: string;       // MM/DD/YYYY
  description: string;
  amount: number;
  category: string;
  payment: string;
  receiptUrl?: string;
  needsVerification?: boolean;
}

export interface SavedEntry extends EntryPayload {
  rowId: number;
}

export interface LineItem {
  description: string | null;
  amount: number | null;
  suggestedCategory: string | null;
}

export interface ReceiptData {
  date: string | null;
  description: string | null;
  totalAmount: number | null;
  suggestedPayment: string | null;
  items: LineItem[];
  receiptUrl?: string;
}

async function call<T>(action: string, payload?: Record<string, unknown>, date?: string): Promise<T> {
  const body: Record<string, unknown> = {
    token: getToken(),
    action,
  };
  if (payload !== undefined) body.payload = date ? { ...payload, date } : payload;

  // No Content-Type header → browser sends text/plain → CORS simple request, no preflight
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const json = await res.json() as { ok: boolean; data?: T; error?: string };
  if (!json.ok) throw new Error(json.error ?? 'Unknown error');
  return json.data as T;
}

export function getDropdowns(date: string): Promise<Dropdowns> {
  return call<Dropdowns>('getDropdowns', undefined, date);
}

export function extractReceipt(
  base64Image: string,
  mimeType: string,
  date: string,
): Promise<{ autoSaved: boolean; split?: boolean; entry?: SavedEntry; receiptData?: ReceiptData }> {
  return call('extractReceipt', { base64Image, mimeType }, date);
}

export function addEntry(entry: EntryPayload, date: string): Promise<{ entry: SavedEntry }> {
  return call('addEntry', { entry }, date);
}

export function addSplitEntries(
  items: Array<{ description: string; amount: number; category: string }>,
  shared: { date: string; payment: string; receiptUrl?: string },
): Promise<{ entries: SavedEntry[] }> {
  return call('addSplitEntries', { items, shared }, shared.date);
}

export function updateEntry(rowId: number, entry: Partial<EntryPayload>, date: string): Promise<{ entry: SavedEntry }> {
  return call('updateEntry', { rowId, entry }, date);
}

export function deleteEntry(rowId: number, date: string): Promise<void> {
  return call('deleteEntry', { rowId }, date);
}

// Convert YYYY-MM-DD (HTML date input) → MM/DD/YYYY (API)
export function toApiDate(htmlDate: string): string {
  const [y, m, d] = htmlDate.split('-');
  return `${m}/${d}/${y}`;
}

// Convert MM/DD/YYYY (API) → YYYY-MM-DD (HTML date input)
export function toHtmlDate(apiDate: string): string {
  const [m, d, y] = apiDate.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// Today as YYYY-MM-DD
export function todayHtml(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
