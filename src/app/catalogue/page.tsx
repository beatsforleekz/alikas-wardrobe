import { CatalogueApp } from "@/components/catalogue/catalogue-app";
import { SetupNotice } from "@/components/ui/setup-notice";
import { hasSupabaseEnv } from "@/lib/env";

export default function CataloguePage() {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  return <CatalogueApp />;
}
