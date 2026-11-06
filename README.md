# Kinfolk

Open **http://staging.localhost/manlapid-tree/** through your existing MAMP/PHP host. This project needs PHP with PDO MySQL; a static Python server and direct file URLs no longer support saving.

## Shared family storage

The MySQL database is `manlapid_tree`. Server-only connection settings are in `server/config.local.php` (ignored by Git). Copy `server/config.example.php` to configure a different installation. This Mac uses the MAMP MySQL socket when present; other installations can use the configured host and port.

Tables are created automatically:

- `family_people`: names, details, and portrait file paths.
- `family_relationships`: explicit parent, child, sibling, and spouse connections.
- `family_state`: requests email and the revision used to detect concurrent edits.

Portraits are resized to at most 320 pixels; milestone pictures to at most 1600 pixels. The server saves image files under `uploads/people/<person-id>/<upload-year>/<upload-month>/` or `uploads/milestones/<milestone-id>/<upload-year>/<upload-month>/`. MySQL stores relative file paths. Content hashes prevent duplicate files for the same record and upload month.

A full manual backup needs both the MySQL database and the `uploads/` folder. **Download family backup** produces a portable JSON backup containing the image bytes, including milestone pictures. Importing it recreates organized image files. Removed/replaced pictures are retained on disk, so old references and existing backups remain recoverable; there is no automatic disk cleanup yet.

Each browser keeps only its selected person and expanded tree in `kinfolk-view-v1` localStorage. The old `kinfolk-v1` browser data remains untouched as a migration backup. Clearing browser storage no longer deletes the shared family records.

The explorer checks for database changes every five seconds, deferring updates while a form is being edited. A revision check rejects stale saves so another browser's changes cannot be silently overwritten.

## Move data from the previous browser address

Browser storage is specific to an address. Existing family data at `http://127.0.0.1:8000/` is not readable at `http://staging.localhost/manlapid-tree/`.

1. In the browser where you edited the old family, open `http://127.0.0.1:8000/export.html` and download the previous family backup.
2. Open the staging address and choose **Import family backup**.

The old address needs a temporary PHP server if one is not already running:

```sh
php -S 127.0.0.1:8000 router.php
```

If the app is opened at the same origin as an existing browser backup and the database is still empty, it imports that backup automatically. A new origin with an empty database offers import, adding a first person, or using the example family. Imports add missing IDs and connections while preserving existing database records. Backups and restores are in **People & relationships**.

## Tree interactions

Search for a name to start a fresh canvas. Click a person to reveal only their parents, siblings, spouses, and children. Previously revealed people remain. Siblings are inferred when they share a parent. Click **Add parent/sibling/spouse/child** to add one connection at a time. Each connection works in both directions.

Missing-person requests open a prefilled email draft and are never sent automatically.

## Local runtime and verification

The MAMP host runs the app directly. For a standalone local runtime use the PHP command above; the router blocks access to server configuration and source-only files. Apache uses `server/.htaccess` to deny direct configuration access. CSRF tokens protect database writes.

Backend round-trip checks cover shared people, relationships, photos and email, cross-session updates, conflicting writes, invalid-data rollback, and deletion. Browser checks cover saving a person and persistence after reload. Tests use an isolated temporary database selected with `KINFOLK_DB_DATABASE`, never the real family database.

Tree motion uses smooth camera fitting and zoom, staggered card entrances, sliding layout transitions, and drawn-in connection lines. Existing cards do not replay entrances on selection. Reduced-motion browser/OS settings disable these animations.

## Exploring a large tree

- Double-click a person (or use **Center person** in the sidebar) to center the view at a readable zoom. **Back to starting person** returns to the original search person without clearing the tree.
- Select someone and use **Collapse branch** in the sidebar to hide connections revealed through that person. People still reachable through other expanded branches remain visible. Collapsing never deletes database records.
- Card labels are relative to the selected person, including grandparents, grandchildren, aunts/uncles, nieces/nephews, cousins, and relationships by marriage. Gender is not recorded, so paired neutral labels are used. Clicking still reveals only parents, children, siblings, and spouses.
- With no selected person, the sidebar suggests six randomly chosen people. Choose one to start their tree, or use **Show other people** to reshuffle.

Run `node tests/layout.test.cjs` and `node tests/exploration.test.cjs` to check layout, connector routing, relationship descriptions, and branch-collapse behavior.

## Relationship finder

Use **Find relationship** in the header, choose two people, and submit. The finder describes the second person's relationship to the first and lists a shortest recorded connection chain. Blood relationships follow a blood path; spouse and in-law paths can include marriage connections. Missing connections and identical selections have dedicated messages.

**Show path in tree** opens a focused view of the connecting people and highlights their route in amber. The first person becomes the starting person for that view. The × on the relationship banner clears the highlight; searching for a different person also clears it. Normal bubble expansion still reveals only immediate family. The finder reads existing records and never changes relationships.

## Birth timeline

The **Timeline** tab groups people by their saved birth year, oldest first, and displays the full birthday with their name and portrait. Births are generated from the existing birthday field rather than separate event records. Missing or invalid dates do not appear. **Add birthdays** opens People so missing dates can be entered; choosing an event opens that person's family tree. Date formatting uses UTC to prevent birthdays shifting by a day between time zones.

## Family milestones

In **Timeline**, choose **Add milestone** to record a marriage, birthday party, move, graduation, reunion, or other event. Each milestone has a title, full date, optional location/story, and optional people involved. Milestones appear beside births in chronological order. Click an event to edit or delete it. Timeline milestones do not automatically change spouse or parent connections.

MySQL stores these in `family_milestones`; the table is created automatically. JSON family backups include milestones, and imports preserve existing milestone IDs. Older clients that omit milestones preserve them when saving other records. Deleting a person removes their participant link while retaining the milestone. Date and participant validation and concurrent-save checks apply to event changes.


## Uploads and picture controls

Both person portraits and milestone picture areas support drag/drop and file picking, with previews before saving. Milestones have no fixed photo-count limit. Individual selected files must be under 20 MB and each save request must fit within 160 MB; add large collections in smaller batches. Remove a thumbnail and save to detach it from the event; click a saved thumbnail to open its image. The server checks file content, dimensions, file size, record ownership, and allowed paths. Uploaded files cannot execute as PHP, and directory listings are disabled.

The web-server user must be able to write to `uploads/`. Browser uploads use generated filenames; original filenames are never used in paths. Existing embedded portraits can be migrated with `php server/migrate-photos.php`; this saves original embedded image data in the protected `server/backups/` folder before changing database references. The migration can be re-run safely. Tests can isolate files using `KINFOLK_UPLOAD_ROOT` alongside `KINFOLK_DB_DATABASE`.

Holiday milestones have their own category group: New Year’s Day/Eve, Valentine’s Day, Easter, Mother’s Day, Father’s Day, Memorial Day, Independence Day, Labor Day, Halloween, Thanksgiving, Hanukkah, Christmas, and Other holiday. Dates are entered manually for each event. Birthday Party is separate from a person’s automatic birth event.


## Milestone videos

Milestone attachments accept pictures, MP4, and MOV files through drag/drop or the file picker. Movies may be up to 100 MB each (decimal MB); portrait images remain image-only. MP4 files keep their original bytes. MOV files are retained in their original folder and converted with FFmpeg to browser-friendly H.264/AAC MP4, capped at 1920 pixels without upscaling. Set `KINFOLK_FFMPEG` if FFmpeg is installed outside the detected system paths. Conversion is required before MOV playback on browsers that cannot preview the original.

Timeline covers and the lightbox support both media types. The lightbox uses native video controls, pauses playback when changing items or closing, and wraps next/previous navigation across pictures and movies. The standalone PHP router supports byte ranges for video seeking; Apache serves these files directly. Portable JSON backups include the playable video file. Manual filesystem backups also include original MOV files.

Each save request is limited to 160 MB of JSON, including base64 overhead on new media. Add very large collections in separate saves. Image size/dimension checks and movie-content validation remain enforced.

Browser JSON saves use PUT (with CSRF protection) to avoid PHP’s form-POST size cap. Small older POST clients remain supported. A 100 MB MP4 save was verified end to end in an isolated database.

### Media database records

`family_media` is the source of truth for portrait and milestone attachment references. Each attachment has a stable UUID, owner type/ID, file path, image/video type, MIME type, byte size, dimensions when available, and display order. Caption and captured-date columns are reserved for future editing features. The first milestone attachment is its cover.

The API still returns `person.photo` and `milestone.photos` for compatibility, hydrated from `family_media`. Existing columns on the owner tables are maintained as compatibility mirrors; do not edit them directly. Saves reconcile media records within the family transaction, preserving IDs and metadata when attachments are reordered. Detached references are removed from the table without deleting files.

The one-time `media-table-v1` migration saves the previous owner/media records under the protected `server/backups/` folder and verifies reference counts and exact album ordering before committing. `family_migrations` prevents repeated imports. Uploaded files remain in their existing folders. Back up both MySQL and `uploads/`.

Run `php tests/media.test.php` for isolated MySQL integration checks (creates and drops a separate test database).

### Albums

`family_albums` stores title, optional date, and description. `family_milestones.album_id` optionally links one milestone to an album. Album photos/videos are `family_media` rows with `owner_type='album'`; portraits remain `owner_type='person'`. The first ordered attachment is the cover. APIs expose `albums` and retain the milestone `photos` compatibility view, hydrated from its linked album.

The `milestone-albums-v1` migration creates one album per milestone with media, copies the milestone title/date/story, and changes the existing media owner without moving files or changing media IDs, captions, ordering, or covers. Protected backups are written before migration. Milestones without media are unchanged. Deleting a milestone keeps its album; deleting an album unlinks its milestone and retains the files.

Albums supports chronological year groups (newest/oldest), title search, independent albums with optional dates, photo/video uploads and drag/drop, immediate cover selection, lightboxes, and direct album/media links. Milestone editors may select an unlinked album or create a new linked album by uploading media. Portable family backups include independent and linked albums, embedding each album's media once.

Additional checks: `php tests/albums.test.php` (disposable MySQL database).

### Family recipes

Recipes has its own page, searchable cards, category/person filters, a cooking view with ingredient lists and numbered instructions, sharing links (`#recipe=<id>`), and a print action. The editor stores title, family attribution, category, ingredients, instructions, servings, prep/cooking minutes, a family story, and image attachments (including handwritten recipe scans). Images support drag/drop, lightboxes, cover selection, and per-photo links.

`family_recipes` stores the recipe fields; photos use `family_media` with `owner_type='recipe'` and files under `uploads/recipes/<recipe-id>/<upload-year>/<month>/`. Recipe attribution is cleared when its person is deleted; the recipe remains. Recipe deletion retains uploaded files. Family backups include recipes and embedded recipe photos; imports add missing recipe IDs. Recipe writes use the shared revision lock and CSRF checks. Regular family and album saves preserve recipe media.

Run `php tests/recipes.test.php` for isolated MySQL storage tests. Timeline, Albums, and Recipes share a centered 1440px maximum content width; albums use five columns at 1400px and six at 1800px viewport widths.


### Frontend organization and rollback

The frontend has been formatted and split into feature files under `js/`, with additional feature styles under `css/`. The PHP/MAMP runtime and family database are unchanged. See [CODE_STRUCTURE.md](CODE_STRUCTURE.md) for file responsibilities, formatting/test commands, and the pre-cleanup rollback archive.

### Approximate Dates and Anniversaries

Birth Date, Death Date, moved-here dates, and Living Here Since accept `YYYY-MM-DD`, `1940`, `About 1940`, or `Date unknown`. Existing full birthdays remain compatible; new person date details are stored in `family_people.date_details` (an additive automatic migration). Location-history dates retain their precision as text. Blank person dates mean unrecorded; Date unknown explicitly records uncertainty. Entering a death date checks Deceased.

Timeline displays approximate births and deaths without inventing month/day values, with unknown dates grouped separately. Upcoming Anniversaries appears in the right sidebar and lists the next 90 days of living people's birthdays, Marriage milestones, and deceased people's death-date anniversaries. Only exact dates recur. February 29 is observed on February 28 outside leap years.

`npm test` includes date and anniversary logic checks. `php tests/date-storage.test.php` verifies API validation and SQL persistence in an automatically removed temporary MySQL database.
