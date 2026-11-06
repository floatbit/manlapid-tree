import { createApp } from 'vue';
import App from './App.vue';
import { bindRuntime } from './ui/runtime.js';
createApp(App).mount('#app');
const { runtime } = await import('virtual:family-runtime');
bindRuntime(runtime);
await runtime.initialize();
