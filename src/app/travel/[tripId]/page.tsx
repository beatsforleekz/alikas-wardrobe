import { TripDetailShell } from "@/components/travel/trip-detail-shell";
import { SetupNotice } from "@/components/ui/setup-notice";
import { hasSupabaseEnv } from "@/lib/env";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const { tripId } = await params;

  return <TripDetailShell tripId={tripId} />;
}
