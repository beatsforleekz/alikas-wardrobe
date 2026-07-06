import { InventoryApp } from "@/components/inventory/inventory-app";
import { SetupNotice } from "@/components/ui/setup-notice";
import { hasSupabaseEnv } from "@/lib/env";

export default function HomePage() {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  return <InventoryApp />;
}
