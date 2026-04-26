<script lang="ts">
  import { route } from './lib/store';
  import Auth from './routes/Auth.svelte';
  import Home from './routes/Home.svelte';
  import Scan from './routes/Scan.svelte';
  import Entry from './routes/Entry.svelte';
  import Audit from './routes/Audit.svelte';
</script>

{#if $route === 'auth'}
  <Auth />
{:else if $route === 'home'}
  <Home />
{:else if $route === 'scan'}
  <Scan />
{:else if $route === 'entry'}
  <Entry />
{:else if $route === 'audit'}
  <Audit />
{/if}
