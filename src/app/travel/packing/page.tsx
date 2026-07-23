import Link from "next/link";

import { SetupNotice } from "@/components/ui/setup-notice";
import { hasSupabaseEnv } from "@/lib/env";

export default function TravelPackingPage() {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  return (
    <main className="page-shell">
      <section className="dashboard">
        <article className="detail-card">
          <p className="eyebrow">Travel workflow updated</p>
          <h1 className="page-title">Packing now lives inside each trip.</h1>
          <p className="detail-description">
            Open a trip to move through Capsule, Packing, Essentials, Packed Summary, and Travel Wardrobe in order.
          </p>
          <Link className="primary-button" href="/travel">
            Open Trips
          </Link>
        </article>
      </section>
    </main>
  );
}
