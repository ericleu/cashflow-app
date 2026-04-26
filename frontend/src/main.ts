import './app.css';
import App from './App.svelte';
import { getToken } from './lib/auth';
import { route } from './lib/store';

const token = getToken();
if (token) route.set('home');

const app = new App({
  target: document.getElementById('app')!,
});

export default app;
