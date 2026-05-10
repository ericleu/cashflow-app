<script lang="ts">
  import { onMount } from 'svelte';
  import { route, savedEntry, pendingEntry, pendingReceiptData, pendingSplitData, pendingImage, activeDate } from '../lib/store';
  import { extractReceipt, toApiDate, todayHtml } from '../lib/api';

  let loading = false;
  let error = '';

  const image = $pendingImage;

  if (!image) route.set('home');

  async function scan() {
    if (!image) return;
    loading = true;
    error = '';
    try {
      const date = $activeDate || toApiDate(todayHtml());
      const result = await extractReceipt(image.base64Image, image.mimeType, date);

      if (result.autoSaved && result.entry) {
        savedEntry.set(result.entry);
        pendingEntry.set(result.entry);
        route.set('audit');
      } else if (result.split && result.receiptData) {
        pendingSplitData.set(result.receiptData);
        route.set('audit');
      } else if (result.receiptData) {
        const rd = result.receiptData;
        const firstItem = rd.items?.[0];
        pendingEntry.set({
          date: rd.date ?? undefined,
          description: rd.description ?? '',
          amount: firstItem?.amount ?? undefined,
          category: firstItem?.suggestedCategory ?? undefined,
          payment: rd.suggestedPayment ?? '',
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
  </div>
</div>
