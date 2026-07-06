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
- The `outfits` table is used for Phase 2 read-only lookbooks, linked to wardrobe `item_id` values in the application layer
- Additional tables such as `packs` remain reference-only for future phases

## Future Outfit Linking Notes

- `BAG_002` = Beige woven beach bag
- `BAG_001` = Black Pearl Drawstring Bag
- `SHOE_001` = White Square Toe Flip Flops, not gold sandals
- Gold flat sandals are not owned and belong in future Gap Analysis / To Get only
- `TOP_051` should be treated as a cover-up option
- `COVERUP_001` can be used as a bottom option
- `HAIR_003` Whitney should be the default hair for holiday lookbooks
