<script lang="ts">
  import { route, dropdowns, activeDate, pendingEntry, pendingImage, entryMode, savedEntry } from '../lib/store';
  import { getDropdowns, todayHtml, toApiDate } from '../lib/api';
  import { clearToken } from '../lib/auth';
  import { openFilePicker } from '../lib/camera';

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

  function goScan() {
    pendingImage.set(null);
    route.set('scan');
  }

  async function goAddManual() {
    const image = await openFilePicker();
    pendingEntry.set({});
    pendingImage.set(image);
    entryMode.set('add');
    route.set('entry');
  }

  function goAddEmpty() {
    pendingEntry.set({});
    pendingImage.set(null);
    entryMode.set('add');
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
        <button class="btn-primary" style="padding: 20px; font-size: 18px;" on:click={goScan}>
          📷  Scan Receipt
        </button>

        <button class="btn-secondary" style="padding: 20px; font-size: 18px;" on:click={goAddManual}>
          🖼  Attach Photo + Add Entry
        </button>

        <button class="btn-secondary" style="padding: 20px; font-size: 18px;" on:click={goAddEmpty}>
          ✏️  Add Entry Manually
        </button>
      </div>
    {/if}
  </div>
</div>
