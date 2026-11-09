import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import fs from 'node:fs';
import path from 'node:path';
const runtimeId = '\0family-runtime';
export default defineConfig({
  base: './',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    __VUE_OPTIONS_API__: false,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  plugins: [
    vue(),
    {
      name: 'family-runtime',
      resolveId(id) {
        if (id === 'virtual:family-runtime') return runtimeId;
      },
      load(id) {
        if (id !== runtimeId) return;
        const order = JSON.parse(fs.readFileSync('scripts/runtime-order.json', 'utf8'));
        for (const file of order) this.addWatchFile(path.resolve(file));
        return (
          `import { ui } from ${JSON.stringify(path.resolve('src/ui/runtime.js'))};\n` +
          order.map((file) => fs.readFileSync(file, 'utf8')).join('\n') +
          `\n
export const runtime = {
 get data() { return data; },
 start, familyDateYear, milestoneIcons, milestoneTypes, displayName, firstLastName, personMatchesQuery, initials, familyDateLabel,
 upcomingAnniversaries, sortedAlbums, milestoneMediaCount,
 isMilestoneVideo, showSection, edit, selectPersonFromDirectory, openMilestone,
 deletePhotoFromLightbox, savePhotoPeople, openTaggedPerson, openAlbum, openRecipe, closeRecipe, editRecipe, recipeCategories, openPhotoLightbox, copyDirectLink, notify,
 updatePersonUnsaved, loadFamilyAlbums, attachBirthEventAlbum, createBirthEventAlbum, resizePhoto, saveFamilyGroup, deleteFamilyGroup, openSavedFamilyTree, openFamilyMapLocation,
 initialize: connectDatabase,
};\n`
        );
      },
      transformIndexHtml(html) {
        return html.replace('src="frontend/app.js"', 'src="/src/main.js"');
      },
    },
  ],
  build: {
    outDir: 'frontend',
    emptyOutDir: true,
    lib: { entry: 'src/main.js', formats: ['es'], fileName: () => 'app.js' },
    rollupOptions: {
      output: { chunkFileNames: 'chunks/[name]-[hash].js', assetFileNames: '[name][extname]' },
    },
  },
  server: {
    proxy: {
      '/api.php': {
        target: 'http://staging.localhost',
        changeOrigin: true,
        rewrite: (p) => '/manlapid-tree' + p,
      },
      '/uploads': {
        target: 'http://staging.localhost',
        changeOrigin: true,
        rewrite: (p) => '/manlapid-tree' + p,
      },
    },
  },
});
