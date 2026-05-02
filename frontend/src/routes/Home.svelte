<script lang="ts">
  import { route, dropdowns, activeDate, pendingEntry, pendingImage, entryMode, savedEntry, pendingReceiptData } from '../lib/store';
  import { getDropdowns, todayHtml, toApiDate } from '../lib/api';
  import { clearToken } from '../lib/auth';
  import { openCamera, openFilePicker } from '../lib/camera';

  let loading = false;
  let error = '';

  async function refreshDropdowns() {
    loading = true;
    error = '';
    try {
      const data = await getDropdowns($activeDate || toApiDate(todayHtml()));
      dropdowns.set(data);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load';
    } finally {
      loading = false;
    }
  }

  if (!$dropdowns) refreshDropdowns();

  async function takePhoto() {
    const image = await openCamera();
    if (!image) return;
    savedEntry.set(null);
    pendingEntry.set({});
    pendingReceiptData.set(null);
    pendingImage.set(image);
    route.set('scan');
  }

  async function choosePhoto() {
    const image = await openFilePicker();
    if (!image) return;
    savedEntry.set(null);
    pendingEntry.set({});
    pendingReceiptData.set(null);
    pendingImage.set(image);
    route.set('scan');
  }

  function goAddEmpty() {
    pendingEntry.set({});
    pendingImage.set(null);
    entryMode.set('add');
    savedEntry.set(null);
    route.set('entry');
  }

  function logout() {
    clearToken();
    dropdowns.set(null);
    route.set('auth');
  }
</script>

<div class="screen">
  <div class="screen-header">
    <h1>Cashflow</h1>
    <button class="btn-secondary" style="width: auto; padding: 6px 12px; font-size: 14px;" on:click={logout}>
      Sign out
    </button>
  </div>

  <div class="screen-body" style="justify-content: center; align-items: center;">
    {#if loading}
      <p style="color: var(--text-muted);">Loading…</p>
    {:else if error}
      <p style="color: var(--red);">{error}</p>
      <button class="btn-secondary" on:click={refreshDropdowns}>Retry</button>
    {:else}
      <div style="display: flex; flex-direction: column; gap: 16px; width: 100%;">
        <button
          class="btn-secondary"
          style="padding: 24px; font-size: 18px; display: flex; align-items: center; justify-content: center; gap: 12px;"
          on:click={goAddEmpty}
        >
          <span style="font-size: 28px;">✏️</span> Add Manually
        </button>

        <button
          class="btn-secondary"
          style="padding: 24px; font-size: 18px; display: flex; align-items: center; justify-content: center; gap: 12px;"
          on:click={choosePhoto}
        >
          <span style="font-size: 28px;">🖼</span> Choose Photo
        </button>

        <button
          class="btn-primary"
          style="padding: 24px; font-size: 18px; display: flex; align-items: center; justify-content: center; gap: 12px;"
          on:click={takePhoto}
        >
          <span style="font-size: 28px;">📷</span> Take Photo
        </button>
      </div>
    {/if}
  </div>
</div>
