<script lang="ts">
  import { setToken, clearToken } from '../lib/auth';
  import { route, dropdowns, activeDate } from '../lib/store';
  import { getDropdowns, todayHtml, toApiDate } from '../lib/api';

  let token = '';
  let error = '';
  let loading = false;

  async function login() {
    if (!token.trim()) return;
    error = '';
    loading = true;
    try {
      setToken(token.trim());
      const apiDate = toApiDate(todayHtml());
      const data = await getDropdowns(apiDate);
      dropdowns.set(data);
      activeDate.set(apiDate);
      route.set('home');
    } catch (e) {
      error = e instanceof Error ? e.message : 'Login failed';
      clearToken();
    } finally {
      loading = false;
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') login();
  }
</script>

<div class="screen" style="justify-content: center; align-items: center; gap: 24px; padding: 32px;">
  <div style="text-align: center;">
    <div style="font-size: 48px; margin-bottom: 8px;">💰</div>
    <h1 style="font-size: 24px; font-weight: 700;">Cashflow</h1>
    <p style="color: var(--text-muted); margin-top: 4px;">Enter your access token</p>
  </div>

  <div class="card" style="width: 100%; max-width: 360px;">
    <div class="field">
      <label for="token">Access Token</label>
      <input
        id="token"
        type="password"
        bind:value={token}
        on:keydown={onKeyDown}
        placeholder="Paste token here"
        autocomplete="current-password"
      />
    </div>

    {#if error}
      <p style="color: var(--red); font-size: 14px; margin-top: 8px;">{error}</p>
    {/if}

    <button
      class="btn-primary"
      style="margin-top: 16px;"
      on:click={login}
      disabled={loading}
    >
      {loading ? 'Verifying…' : 'Continue'}
    </button>
  </div>
</div>
