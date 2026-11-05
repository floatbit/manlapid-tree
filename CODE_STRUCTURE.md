# Code structure

The site still runs directly through PHP/MAMP, with no frontend build step.

## Browser code

`index.html` defines markup and the ordered script list. Files use the existing shared browser scope; preserve that order when adding dependencies. `app.js` now contains only database startup and refresh registration.

- `js/core.js`: browser state, names, API requests, shared saves, ancestry safeguards.
- `js/relationships.js`: immediate connections, kinship labels, path finding and branch reachability.
- `js/tree.js`: tree layout, connectors, camera and rendering.
- `js/tree-controls.js`: quick-add family dialog, pan, zoom and fit controls.
- `js/navigation.js`: sidebar, suggestions, header search and page navigation.
- `js/milestones.js`: chronological events, milestone editor and media controls.
- `js/people.js`: directory search, profile form, portraits and connections.
- `js/backups.js`: portable backup export/import.
- `js/relationship-finder.js` and `js/person-picker.js`: relationship page controls.
- `js/lightbox.js` and `js/sharing.js`: image/video viewer and direct links.
- `js/timeline-position.js`: timeline scroll restoration.
- `js/sibling-groups.js`: batch sibling connections.
- `js/location-picker.js`, `js/location-history.js`, `js/bulk-location.js`: Google location inputs and history.
- `js/map.js`, `js/albums.js`, `js/recipes.js`: feature pages.

## Styles

`style.css` contains the original base, tree and editor styles. `css/features.css` contains subsequent page/component styles. Stylesheet order is preserved deliberately so the cleanup does not change the cascade. Existing overrides remain until they can be consolidated with dedicated visual coverage.

## Server

`api.php` coordinates requests and transactions. `server/` holds database setup, validation, media, albums and recipes. Server code and database migration behavior were left unchanged during this frontend cleanup. `router.php` serves an explicit allowlist of public files for the PHP development server.

## Checks and formatting

Install development tools with `npm install`; these are not needed to serve the app. `npm run format` and `npm run format:check` use the checked-in Prettier configuration. JavaScript, HTML and CSS are formatted; embedded HTML strings are deliberately not rewritten. PHP remains independently organized under `server/`.

`npm test` checks asset routing, JavaScript parsing, layout, kinship, ancestry and location history. `npm run test:database` exercises media/albums/recipes in disposable MySQL databases and needs access to the configured MySQL server. Tests load scripts in the same order as `index.html` instead of assuming all code lives in `app.js`.

## Rollback of this cleanup

The pre-cleanup source archive is:

`/Users/chrismanlapid/Desktop/htdocs/staging/manlapid-tree/server/backups/code-cleanup-20261104-225529.tar.gz`

From the project directory, restore it with:

```sh
tar -xzf server/backups/code-cleanup-20261104-225529.tar.gz
```

This restores the former HTML, JavaScript, CSS, router, tests and documentation. New feature files become unused because the restored HTML references the original scripts. The archive deliberately excludes credentials, uploads, Git internals and earlier backups. This cleanup does not modify family records, uploaded media or server configuration, so no database rollback is needed.
