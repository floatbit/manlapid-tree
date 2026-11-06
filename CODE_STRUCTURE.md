# Frontend structure

The app uses Vue 3 and Vite while continuing to run through the existing PHP/MAMP
host and MySQL API. `npm run build` generates `frontend/`; see README for deployment.

## Vue application

- `src/main.js` mounts the component tree, binds the controller adapter, and starts database loading.
- `src/App.vue` composes the header, pages, dialogs, and system notices.
- `src/pages/` contains the eight page components. All pages remain mounted so switching pages preserves form drafts, canvas state, and focus behavior.
- `src/components/` contains reactive Reports, album/recipe listings, recipe details, Timeline events, anniversaries, autocomplete, connection rows, nickname tags, media previews, avatars, and notifications.
- `src/dialogs/` separates each dialog's template. `PhotoLightbox.vue` owns its reactive photo/video navigation, keyboard handling, sharing, and focus restoration.
- `src/domain/reports.js` calculates recorded generations without DOM dependencies.
- `src/ui/runtime.js` owns shallow reactive view models and the small adapter between Vue and the existing controllers. Components read saved snapshots and invoke explicit controller actions; they do not call the database directly.

## Existing controllers and algorithms

`js/` retains the existing database/save, tree layout, map SDK, upload, location,
backup, and form controllers. These are **not all rewritten as Vue composables**.
Keeping the established mutation and validation paths preserves behavior while
UI is extracted. These files are bundled into one ES module, not loaded as browser
globals or separate script tags. `scripts/runtime-order.json` declares their
compatibility order; Vite's `family-runtime` plugin watches and bundles them.

Future controller extraction can replace this compatibility adapter one service
at a time. Do not give Vue and a controller competing ownership of the same DOM
subtree. Dynamic Vue components are unmounted before controller-owned rows or
pickers are replaced.

- `js/core.js`: saved family data, PHP requests/revision locks, refresh, names, dates, ancestry validation.
- `js/relationships.js`, `js/tree.js`, `js/tree-controls.js`: kinship, path finding, layout, routing, canvas/camera interactions, and quick-add.
- `js/navigation.js`, `js/sharing.js`: existing hash URL format, Back/Forward, deep links, sidebar, tree search.
- `js/people.js`: profile saving, portraits, dirty-state indication, and adapters to Vue directory/connection/nickname controls.
- `js/milestones.js`, `js/albums.js`, `js/recipes.js`: domain calculations and CRUD/upload controllers, delegating page rendering to Vue.
- `js/map.js` and `js/location-*.js`: Google Maps/Places integrations and recorded locations.
- `js/sibling-groups.js`, `js/children-groups.js`, `js/bulk-location.js`: bulk validation/save controllers using the shared Vue autocomplete.
- `js/backups.js`: portable backup import/export.
- `js/timeline-position.js`: scroll and location-rail measurement.

## Styles and server

`style.css` and `css/features.css` preserve the existing cascade and appearance.
Server code, database schema, and upload layout are unchanged by this migration.
`router.php` allows generated public frontend assets, while keeping server files private.

## Validation

- `npm run build`: compile Vue and bundle production assets.
- `npm test`: Vue compilation/public asset checks, existing layout/kinship/history/date/URL tests, and DOM-based Vue component interactions.
- `npm run test:database`: media, album, recipe migration/save/load/rollback checks in disposable databases.
- `npm run format` / `npm run format:check`: source formatting, including Vue components.

Rollback: restore your pre-migration Git commit, then follow that commit's launch
instructions. Reverting a future Vue change requires rebuilding `frontend/` from
its matching source before serving it. No database rollback is needed for this
frontend migration.
