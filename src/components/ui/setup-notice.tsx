export function SetupNotice() {
  return (
    <main className="page-shell">
      <section className="setup-notice">
        <p className="eyebrow">Setup required</p>
        <h1>Supabase environment variables are missing</h1>
        <p>
          Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to a local
          `.env.local` file before running the app.
        </p>
      </section>
    </main>
  );
}

