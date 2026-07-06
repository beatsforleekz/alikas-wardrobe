# Alika's Wardrobe

Phase 1 of a clean standalone rebuild of the wardrobe system from AlikasWorld.

This project focuses only on the wardrobe foundation:

- Supabase Auth login
- Supabase connection
- inventory browsing
- search
- filters
- item detail pages

It intentionally does not include lookbooks, packing, trips, AI styling, recommendations, analytics, exports, or any other later-phase features.

## Stack

- Next.js
- React
- TypeScript
- Supabase

## Phase 1 Features

- Responsive inventory dashboard
- Email/password login powered by Supabase Auth
- Session detection on page load
- Logout for the active user
- Search across `item_id`, `item_name`, `colour`, `category`, `tags`, and `vibe`
- Filters for `category`, `status`, `season`, `style_type`, and `travel_friendly`
- Dynamic category options sourced from inventory data
- Inventory cards showing image, item ID, item name, category, and status
- Dedicated item detail route for full metadata display
- Setup guard when Supabase environment variables are missing

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env.local
```

3. Add your Supabase values to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. Make sure the wardrobe user exists in Supabase Auth and can sign in with email/password.

5. Start the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) and sign in.

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```

## Supabase Notes

- Phase 1 reads from the existing `inventory` table only.
- Inventory access is performed with the signed-in user's Supabase session.
- The SQL files in [`database/schema`](./database/schema) are treated as the schema reference for this repository.
- No schema changes are included in this phase.
- The app does not use a service role key and does not bypass RLS.
- If future UI work requires schema changes, propose SQL separately before applying it.

## Deployment

This app is ready for standard Next.js deployment targets such as:

- Vercel
- Netlify
- a self-hosted Node environment

Before deploying, configure these environment variables in the hosting platform:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Then run:

```bash
npm run build
```

## Suggested Next Steps For Phase 2

- inventory editing workflows
- pagination or incremental loading if the dataset grows significantly
- authentication and user-aware access controls
- richer media handling and image fallbacks
