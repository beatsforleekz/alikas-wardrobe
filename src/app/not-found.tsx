import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell">
      <section className="empty-state">
        <p className="eyebrow">Not found</p>
        <h1>Item not found</h1>
        <p>The requested inventory record could not be found.</p>
        <Link className="button-link" href="/">
          Return home
        </Link>
      </section>
    </main>
  );
}

