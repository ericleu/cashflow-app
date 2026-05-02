<script lang="ts">
  import { onMount } from 'svelte';
  import { route, savedEntry, pendingEntry, pendingReceiptData, pendingImage, activeDate, dropdowns } from '../lib/store';
  import { extractReceipt, toApiDate, todayHtml } from '../lib/api';

  let saveReceipt = true;
  let loading = false;
  let error = '';

  const image = $pendingImage;

  // If we arrived here without an image, go back
  if (!image) route.set('home');

  async function scan() {
    if (!image) return;
    loading = true;
    error = '';
    try {
      const date = $activeDate || toApiDate(todayHtml());
      const result = await extractReceipt(image.base64Image, image.mimeType, saveReceipt, date);

      if (result.autoSaved && result.entry) {
        savedEntry.set(result.entry);
        pendingEntry.set(result.entry);
        route.set('audit');
      } else if (result.receiptData) {
        const rd = result.receiptData;
        pendingEntry.set({
          date: rd.date ?? undefined,
          description: rd.description ?? '',
          amount: rd.amount ?? undefined,
          category: rd.suggestedCategory ?? undefined,
          payment: '',
        });
        pendingReceiptData.set(rd);
        route.set('entry');
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Scan failed';
      loading = false;
    }
  }

  onMount(() => { scan(); });
</script>

<div class="screen">
  <div class="screen-header">
    <button class="back-btn" on:click={() => route.set('home')} disabled={loading}>←</button>
    <h1>Scanning…</h1>
  </div>

  <div class="screen-body" style="align-items: center; gap: 20px;">
    {#if image}
      <img
        src={image.previewUrl}
        alt="Receipt preview"
        style="width: 100%; border-radius: var(--radius); border: 1px solid var(--border); max-height: 50vh; object-fit: contain;"
      />
    {/if}

    {#if loading}
      <p style="color: var(--text-muted); font-size: 15px;">Reading receipt…</p>
    {:else if error}
      <p style="color: var(--red);">{error}</p>
      <button class="btn-primary" on:click={scan}>Try Again</button>
    {/if}

    {#if !loading}
      <label style="display: flex; align-items: center; gap: 8px; font-size: 15px;">
        <input type="checkbox" bind:checked={saveReceipt} style="width: auto;" />
        Save receipt photo to Drive
      </label>
    {/if}
  </div>
</div>
