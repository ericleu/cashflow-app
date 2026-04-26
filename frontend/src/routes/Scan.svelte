<script lang="ts">
  import { route, pendingEntry, pendingReceiptData, activeDate, dropdowns } from '../lib/store';
  import { extractReceipt, toApiDate, todayHtml } from '../lib/api';
  import { openFilePicker } from '../lib/camera';
  import type { ImageCapture } from '../lib/camera';

  let image: ImageCapture | null = null;
  let saveReceipt = true;
  let loading = false;
  let error = '';

  async function pickImage() {
    const picked = await openFilePicker();
    if (picked) image = picked;
  }

  async function scan() {
    if (!image) return;
    loading = true;
    error = '';
    try {
      const date = $activeDate || toApiDate(todayHtml());
      const result = await extractReceipt(image.base64Image, image.mimeType, saveReceipt, date);

      if (result.autoSaved && result.entry) {
        // All fields present → auto-saved → go to audit
        pendingEntry.set(result.entry);
        route.set('audit');
      } else if (result.receiptData) {
        // Missing fields → pre-fill entry form
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
    } finally {
      loading = false;
    }
  }
</script>

<div class="screen">
  <div class="screen-header">
    <button class="back-btn" on:click={() => route.set('home')}>←</button>
    <h1>Scan Receipt</h1>
  </div>

  <div class="screen-body">
    {#if image}
      <img
        src={image.previewUrl}
        alt="Receipt preview"
        style="width: 100%; border-radius: var(--radius); border: 1px solid var(--border); max-height: 50vh; object-fit: contain;"
      />
      <button class="btn-secondary" on:click={pickImage}>Change photo</button>
    {:else}
      <div
        class="card"
        style="display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; cursor: pointer;"
        on:click={pickImage}
        on:keypress={(e) => e.key === 'Enter' && pickImage()}
        role="button"
        tabindex="0"
      >
        <span style="font-size: 48px;">📷</span>
        <p style="color: var(--text-muted);">Tap to select or take a photo</p>
      </div>
    {/if}

    <label style="display: flex; align-items: center; gap: 8px; font-size: 15px;">
      <input type="checkbox" bind:checked={saveReceipt} style="width: auto;" />
      Save receipt photo to Drive
    </label>

    {#if error}
      <p style="color: var(--red);">{error}</p>
    {/if}
  </div>

  <div class="screen-footer">
    <button class="btn-primary" on:click={scan} disabled={!image || loading}>
      {loading ? 'Scanning…' : 'Scan with AI'}
    </button>
  </div>
</div>
