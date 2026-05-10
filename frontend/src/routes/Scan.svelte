<script lang="ts">
  import { onMount } from 'svelte';
  import { route, savedEntry, savedEntries, pendingImage, activeDate } from '../lib/store';
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
      if (result.entries?.length) {
        savedEntries.set(result.entries);
        savedEntry.set(null);
      } else if (result.entry) {
        savedEntry.set(result.entry);
        savedEntries.set([]);
      }
      route.set('audit');
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
