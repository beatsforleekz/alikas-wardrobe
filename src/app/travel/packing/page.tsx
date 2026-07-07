import { TravelPackingApp } from "@/components/travel/travel-packing-app";
import { SetupNotice } from "@/components/ui/setup-notice";
import { hasSupabaseEnv } from "@/lib/env";

export default async function TravelPackingPage({
  searchParams,
}: {
  searchParams: Promise<{ trip?: string }>;
}) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const { trip } = await searchParams;

  return <TravelPackingApp initialTripId={trip} />;
}
