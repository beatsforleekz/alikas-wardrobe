# Database Notes

The `database/` folder documents the Supabase wardrobe database used by this app.

## Structure

- `schema/`: SQL files that describe the current database reference data and table content snapshots used for local understanding

## Phase 1 Rules

- Treat the SQL files in `schema/` as the source of truth for the wardrobe schema used by the app
- Do not modify schema during Phase 1
- If a future feature requires schema updates, propose the SQL first and wait for approval before changing anything

## Relationship To Supabase

- The application connects directly to your existing Supabase project
- The app currently reads from the `inventory` table for wardrobe inventory
- Additional tables such as `outfits` and `packs` are present in the repository only as reference for future phases and are not used in Phase 1
