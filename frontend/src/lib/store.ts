import { writable } from 'svelte/store';
import type { SavedEntry, Dropdowns, ReceiptData } from './api';
import type { ImageCapture } from './camera';

export type Route = 'auth' | 'home' | 'scan' | 'entry' | 'audit';
export type EntryMode = 'add' | 'edit';

export const route = writable<Route>('auth');
export const entryMode = writable<EntryMode>('add');

// Partial entry being built (from scan or manual add)
export const pendingEntry = writable<Partial<SavedEntry>>({});

// Full saved entry (used in edit mode)
export const savedEntry = writable<SavedEntry | null>(null);

// Dropdowns fetched once per session (refreshed on home load)
export const dropdowns = writable<Dropdowns | null>(null);

// Image being attached to a manual entry
export const pendingImage = writable<ImageCapture | null>(null);

// Receipt data returned when auto-save was not possible
export const pendingReceiptData = writable<ReceiptData | null>(null);

// The date context used for sheet lookup (MM/DD/YYYY, defaults to today)
export const activeDate = writable<string>('');
