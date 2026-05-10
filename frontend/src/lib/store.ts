import { writable } from 'svelte/store';
import type { SavedEntry, Dropdowns } from './api';
import type { ImageCapture } from './camera';

export type Route = 'auth' | 'home' | 'scan' | 'entry' | 'audit';
export type EntryMode = 'add' | 'edit';

export const route = writable<Route>('auth');
export const entryMode = writable<EntryMode>('add');

// Partial entry being built (from manual add)
export const pendingEntry = writable<Partial<SavedEntry>>({});

// Full saved entry (single scan result or edit target)
export const savedEntry = writable<SavedEntry | null>(null);

// Split scan results (multiple entries saved at once)
export const savedEntries = writable<SavedEntry[]>([]);

// Dropdowns fetched once per session (refreshed on home load)
export const dropdowns = writable<Dropdowns | null>(null);

// Image being attached to a manual entry
export const pendingImage = writable<ImageCapture | null>(null);

// The date context used for sheet lookup (MM/DD/YYYY, defaults to today)
export const activeDate = writable<string>('');
