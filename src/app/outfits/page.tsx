import { OutfitsApp } from "@/components/outfits/outfits-app";
import { SetupNotice } from "@/components/ui/setup-notice";
import { hasSupabaseEnv } from "@/lib/env";

export default function OutfitsPage() {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  return <OutfitsApp />;
}
