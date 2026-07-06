import { InventoryDetailView } from "@/components/inventory/inventory-detail-view";
import { SetupNotice } from "@/components/ui/setup-notice";
import { hasSupabaseEnv } from "@/lib/env";

type ItemDetailPageProps = {
  params: Promise<{
    itemId: string;
  }>;
};

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const { itemId } = await params;
  return <InventoryDetailView itemId={decodeURIComponent(itemId)} />;
}
