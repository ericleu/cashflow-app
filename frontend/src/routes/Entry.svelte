<script lang="ts">
  import {
    route, pendingEntry, pendingImage, entryMode, savedEntry,
    dropdowns, activeDate,
  } from '../lib/store';
  import { addEntry, updateEntry, toApiDate, toHtmlDate, todayHtml } from '../lib/api';
  import type { EntryPayload } from '../lib/api';

  // Form state — initialised from pendingEntry
  let date = $pendingEntry.date ? toHtmlDate($pendingEntry.date) : todayHtml();
  let description = $pendingEntry.description ?? '';
  let amount = $pendingEntry.amount != null ? String(Math.abs($pendingEntry.amount)) : '';
  let isIncome = ($pendingEntry.amount ?? 0) > 0;
  let category = $pendingEntry.category ?? '';
  let payment = $pendingEntry.payment ?? '';
  let selectedTab = '';

  const TABS = ['食', '衣', '住', '行', '育', '樂', '收入', '金融', '無'];

  $: categories = $dropdowns?.categories ?? [];
  $: filteredCategories = selectedTab
    ? categories.filter(c => c.startsWith(selectedTab))
    : categories;

  // Auto-select tab if category already set
  $: if (category && !selectedTab) {
    const tab = TABS.find(t => category.startsWith(t));
    if (tab) selectedTab = tab;
  }

  let loading = false;
  let error = '';

  function formatAmount(): number {
    const n = parseFloat(amount);
    if (isNaN(n)) return 0;
    return isIncome ? Math.abs(n) : -Math.abs(n);
  }

  async function save() {
    if (!date || !amount || !category) {
      error = 'Date, amount, and category are required.';
      return;
    }
    error = '';
    loading = true;

    const apiDate = toApiDate(date);
    const entry: EntryPayload = {
      date: apiDate,
      description,
      amount: formatAmount(),
      category,
      payment,
    };

    try {
      if ($entryMode === 'edit' && $savedEntry) {
        // Use original date for sheet lookup
        const originalDate = $savedEntry.date;
        const result = await updateEntry($savedEntry.rowId, entry, originalDate);
        savedEntry.set(result.entry);
        pendingEntry.set(result.entry);
        route.set('audit');
      } else {
        const result = await addEntry(entry, apiDate);
        savedEntry.set(result.entry);
        pendingEntry.set(result.entry);
        route.set('audit');
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Save failed';
    } finally {
      loading = false;
    }
  }

  function back() {
    route.set($entryMode === 'edit' ? 'audit' : 'home');
  }
</script>

<div class="screen">
  <div class="screen-header">
    <button class="back-btn" on:click={back}>←</button>
    <h1>{$entryMode === 'edit' ? 'Edit Entry' : 'Add Entry'}</h1>
  </div>

  <div class="screen-body">
    {#if $pendingImage}
      <img
        src={$pendingImage.previewUrl}
        alt="Receipt"
        style="width: 100%; border-radius: var(--radius); border: 1px solid var(--border); max-height: 240px; object-fit: contain;"
      />
    {/if}

    <div class="card" style="display: flex; flex-direction: column; gap: 12px;">
      <div class="field">
        <label for="date">Date</label>
        <input id="date" type="date" bind:value={date} />
      </div>

      <div class="field">
        <label for="desc">Description</label>
        <input id="desc" type="text" bind:value={description} placeholder="e.g. Lunch at Tim Hortons" />
      </div>

      <div class="field">
        <label for="amount">Amount</label>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input
            id="amount"
            type="number"
            inputmode="decimal"
            bind:value={amount}
            placeholder="0.00"
            style="flex: 1;"
          />
          <button
            style="width: auto; padding: 10px 16px; background: {isIncome ? 'var(--green)' : 'var(--red)'}; color: #fff;"
            on:click={() => (isIncome = !isIncome)}
          >
            {isIncome ? '+' : '−'}
          </button>
        </div>
      </div>

      <div class="field">
        <label for="category">Category</label>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px;">
          {#each TABS as tab}
            <button
              style="width: auto; padding: 6px 12px; font-size: 14px;
                background: {selectedTab === tab ? 'var(--green)' : 'var(--surface)'};
                color: {selectedTab === tab ? '#fff' : 'var(--text)'};
                border: 1px solid var(--border);"
              on:click={() => { selectedTab = tab; category = categories.filter(c => c.startsWith(tab))[0] ?? ''; }}
            >
              {tab}
            </button>
          {/each}
        </div>
        <select id="category" bind:value={category}>
          <option value="">Select category…</option>
          {#each filteredCategories as c}
            <option value={c}>{c}</option>
          {/each}
        </select>
      </div>

      <div class="field">
        <label for="payment">Payment</label>
        <select id="payment" bind:value={payment}>
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

  <div class="screen-footer" style="display: flex; gap: 8px;">
    <button class="btn-secondary" style="flex: 1;" on:click={back} disabled={loading}>
      Cancel
    </button>
    <button class="btn-primary" style="flex: 1;" on:click={save} disabled={loading}>
      {loading ? 'Saving…' : 'Save Entry'}
    </button>
  </div>
</div>
