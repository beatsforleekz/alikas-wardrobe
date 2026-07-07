import { TripsApp } from "@/components/travel/trips-app";
import { SetupNotice } from "@/components/ui/setup-notice";
import { hasSupabaseEnv } from "@/lib/env";

export default function TravelPage() {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  return <TripsApp />;
}
