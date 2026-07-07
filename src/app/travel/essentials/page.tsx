import { EssentialsLibraryApp } from "@/components/travel/essentials-library-app";
import { SetupNotice } from "@/components/ui/setup-notice";
import { hasSupabaseEnv } from "@/lib/env";

export default function TravelEssentialsPage() {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  return <EssentialsLibraryApp />;
}
