<script lang="ts">
  import {
    route, savedEntry, pendingEntry, entryMode, dropdowns, pendingSplitData,
  } from '../lib/store';
  import { updateEntry, deleteEntry, addSplitEntries } from '../lib/api';
  import type { SavedEntry } from '../lib/api';

  // ── Single-entry audit ──────────────────────────────────────────────────────
  $: entry = $savedEntry ?? ($pendingEntry as SavedEntry);

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
    pendingEntry.set({});
    route.set('home');
  }

  $: amountColor = (entry?.amount ?? 0) >= 0 ? 'var(--green)' : 'var(--red)';
  $: formattedAmount = entry?.amount != null
    ? `${entry.amount >= 0 ? '+' : ''}${entry.amount.toFixed(2)}`
    : '—';

  // ── Split audit ─────────────────────────────────────────────────────────────
  $: splitData = $pendingSplitData;
  $: isSplit = splitData != null;

  interface SplitItem { description: string; amount: number; category: string; }
  let splitItems: SplitItem[] = [];
  let splitPayment = '';
  let splitInitialized = false;
  let saving = false;

  $: if (splitData && !splitInitialized) {
    splitItems = splitData.items.map(i => ({
      description: i.description ?? splitData!.description ?? '',
      amount: i.amount ?? 0,
      category: i.suggestedCategory ?? '',
    }));
    splitPayment = splitData.suggestedPayment ?? '';
    splitInitialized = true;
  }

  $: itemSum = splitItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  $: totalAmount = splitData?.totalAmount ?? 0;
  $: sumOk = Math.abs(itemSum - totalAmount) < 0.01;

  async function saveAll() {
    if (!splitData || !sumOk || saving) return;
    saving = true;
    error = '';
    try {
      await addSplitEntries(
        splitItems.map(i => ({
          description: i.description,
          amount: Number(i.amount),
          category: i.category,
        })),
        {
          date: splitData.date!,
          payment: splitPayment,
          receiptUrl: splitData.receiptUrl,
        }
      );
      pendingSplitData.set(null);
      splitInitialized = false;
      route.set('home');
    } catch (e) {
      error = e instanceof Error ? e.message : 'Save failed';
    } finally {
      saving = false;
    }
  }

  function cancelSplit() {
    pendingSplitData.set(null);
    splitInitialized = false;
    route.set('home');
  }
</script>

{#if isSplit}
  <!-- ── Split receipt confirmation ── -->
  <div class="screen">
    <div class="screen-header">
      <button class="back-btn" on:click={cancelSplit}>←</button>
      <h1>Split Receipt</h1>
    </div>

    <div class="screen-body">
      <div class="card" style="display: flex; flex-direction: column; gap: 6px;">
        <div style="font-size: 14px; color: var(--text-muted);">{splitData?.date}</div>
        <div style="font-weight: 600;">{splitData?.description || '—'}</div>
        <div style="font-size: 22px; font-weight: 700;">Total: ${splitData?.totalAmount?.toFixed(2) ?? '—'}</div>
      </div>

      {#each splitItems as item, i}
        <div class="card" style="display: flex; flex-direction: column; gap: 10px;">
          <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Item {i + 1}</div>

          <div class="field">
            <label for="split-desc-{i}">Description</label>
            <input id="split-desc-{i}" type="text" bind:value={item.description} />
          </div>

          <div class="field">
            <label for="split-cat-{i}">Category</label>
            <select id="split-cat-{i}" bind:value={item.category}>
              <option value="">Select category…</option>
              {#each ($dropdowns?.categories ?? []) as c}
                <option value={c}>{c}</option>
              {/each}
            </select>
          </div>

          <div class="field">
            <label for="split-amt-{i}">Amount</label>
            <input id="split-amt-{i}" type="number" inputmode="decimal" bind:value={item.amount} />
          </div>
        </div>
      {/each}

      <div style="text-align: center; font-size: 14px; padding: 4px 0; color: {sumOk ? 'var(--green)' : 'var(--red)'};">
        {#if sumOk}
          Sum: ${itemSum.toFixed(2)} ✓
        {:else}
          Sum: ${itemSum.toFixed(2)} — must equal ${totalAmount.toFixed(2)}
        {/if}
      </div>

      <div class="card">
        <div class="field">
          <label for="split-payment">Payment Method</label>
          <select id="split-payment" bind:value={splitPayment}>
            <option value="">Select payment…</option>
            {#each ($dropdowns?.payments ?? []) as p}
              <option value={p}>{p}</option>
            {/each}
          </select>
        </div>
      </div>

      {#if error}
        <p style="color: var(--red); font-size: 14px;">{error}</p>
      {/if}
    </div>

    <div class="screen-footer">
      <button class="btn-primary" on:click={saveAll} disabled={!sumOk || saving}>
        {saving ? 'Saving…' : `Save ${splitItems.length} Entries`}
      </button>
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
