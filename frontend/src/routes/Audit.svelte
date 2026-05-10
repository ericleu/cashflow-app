<script lang="ts">
  import {
    route, savedEntry, savedEntries, pendingEntry, entryMode, dropdowns,
  } from '../lib/store';
  import { updateEntry, deleteEntry } from '../lib/api';
  import type { SavedEntry } from '../lib/api';

  // ── Split summary ────────────────────────────────────────────────────────────
  function editSplitItem(e: SavedEntry) {
    savedEntry.set(e);
    entryMode.set('edit');
    route.set('entry');
  }

  function doneSplit() {
    savedEntries.set([]);
    savedEntry.set(null);
    route.set('home');
  }

  // ── Single-entry audit ───────────────────────────────────────────────────────
  $: entry = $savedEntry;

  $: payment = entry?.payment ?? '';
  let savingPayment = false;
  let deleting = false;
  let error = '';

  async function savePayment() {
    if (!entry) return;
    savingPayment = true;
    error = '';
    try {
      const result = await updateEntry(entry.rowId, { payment }, entry.date);
      savedEntry.set(result.entry);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save payment';
    } finally {
      savingPayment = false;
    }
  }

  async function remove() {
    if (!entry) return;
    if (!confirm('Delete this entry?')) return;
    deleting = true;
    error = '';
    try {
      await deleteEntry(entry.rowId, entry.date);
      savedEntry.set(null);
      pendingEntry.set({});
      route.set('home');
    } catch (e) {
      error = e instanceof Error ? e.message : 'Delete failed';
      deleting = false;
    }
  }

  function goEdit() {
    entryMode.set('edit');
    pendingEntry.set({ ...entry });
    route.set('entry');
  }

  function done() {
    savedEntry.set(null);
    savedEntries.set([]);
    pendingEntry.set({});
    route.set('home');
  }

  $: amountColor = (entry?.amount ?? 0) >= 0 ? 'var(--green)' : 'var(--red)';
  $: formattedAmount = entry?.amount != null
    ? `${entry.amount >= 0 ? '+' : ''}${entry.amount.toFixed(2)}`
    : '—';
</script>

{#if $savedEntries.length > 0}
  <!-- ── Split receipt summary ── -->
  <div class="screen">
    <div class="screen-header">
      <button class="back-btn" on:click={doneSplit}>←</button>
      <h1>Split Receipt</h1>
    </div>

    <div class="screen-body">
      <p style="color: var(--text-muted); font-size: 14px; text-align: center;">
        {$savedEntries.length} entries saved
      </p>

      {#each $savedEntries as e}
        <div class="card" style="display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div style="display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0;">
              <div style="font-size: 22px; font-weight: 700; color: {e.amount >= 0 ? 'var(--green)' : 'var(--red)'};">
                {e.amount >= 0 ? '+' : ''}{e.amount.toFixed(2)}
              </div>
              <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                {e.description || '—'}
              </div>
              <div style="font-size: 13px; color: var(--text-muted);">{e.category || '—'}</div>
              <div style="font-size: 13px; color: var(--text-muted);">{e.date}</div>
            </div>
            <button
              class="btn-secondary"
              style="width: auto; padding: 8px 16px; flex-shrink: 0;"
              on:click={() => editSplitItem(e)}
            >
              Edit
            </button>
          </div>

          {#if e.needsVerification}
            <div style="background: #FEF3C7; border-radius: var(--radius-sm); padding: 8px 12px; font-size: 13px; color: #92400E;">
              ⚠ Needs verification — please confirm details are correct
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <div class="screen-footer">
      <button class="btn-primary" on:click={doneSplit}>Done</button>
    </div>
  </div>

{:else}
  <!-- ── Single-entry audit ── -->
  <div class="screen">
    <div class="screen-header">
      <button class="back-btn" on:click={done}>←</button>
      <h1>Entry Saved</h1>
    </div>

    <div class="screen-body">
      {#if entry}
        <div class="card" style="display: flex; flex-direction: column; gap: 16px;">
          <div style="text-align: center;">
            <div style="font-size: 36px; font-weight: 700; color: {amountColor};">
              {formattedAmount}
            </div>
            <div style="color: var(--text-muted); font-size: 14px; margin-top: 4px;">
              {entry.date}
            </div>
          </div>

          <hr style="border: none; border-top: 1px solid var(--border);" />

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted); font-size: 14px;">Description</span>
              <span style="font-weight: 500;">{entry.description || '—'}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted); font-size: 14px;">Category</span>
              <span style="font-weight: 500;">{entry.category || '—'}</span>
            </div>
            {#if entry.receiptUrl}
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-muted); font-size: 14px;">Receipt</span>
                <a href={entry.receiptUrl} target="_blank" style="color: var(--green); font-size: 14px;">View ↗</a>
              </div>
            {/if}
            {#if entry.needsVerification}
              <div style="background: #FEF3C7; border-radius: var(--radius-sm); padding: 8px 12px; font-size: 13px; color: #92400E;">
                ⚠ Needs verification — please confirm details are correct
              </div>
            {/if}
          </div>

          <hr style="border: none; border-top: 1px solid var(--border);" />

          <!-- Inline payment edit -->
          <div class="field">
            <label for="payment">Payment Method</label>
            <div style="display: flex; gap: 8px;">
              <select id="payment" bind:value={payment} style="flex: 1;">
                <option value="">Select payment…</option>
                {#each ($dropdowns?.payments ?? []) as p}
                  <option value={p}>{p}</option>
                {/each}
              </select>
              <button
                style="width: auto; padding: 10px 16px; background: var(--green); color: #fff;"
                on:click={savePayment}
                disabled={savingPayment}
              >
                {savingPayment ? '…' : '✓'}
              </button>
            </div>
          </div>
        </div>

        {#if error}
          <p style="color: var(--red); font-size: 14px;">{error}</p>
        {/if}
      {:else}
        <p style="color: var(--text-muted);">No entry loaded.</p>
      {/if}
    </div>

    <div class="screen-footer" style="flex-direction: column; gap: 8px;">
      <div style="display: flex; gap: 8px;">
        <button class="btn-secondary" style="flex: 1;" on:click={goEdit}>Edit</button>
        <button
          style="flex: 1; background: var(--red); color: #fff; border-radius: var(--radius-sm); padding: 12px;"
          on:click={remove}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
      <button class="btn-primary" on:click={done}>Done</button>
    </div>
  </div>
{/if}
