import { OutfitDetailView } from "@/components/outfits/outfit-detail-view";
import { SetupNotice } from "@/components/ui/setup-notice";
import { hasSupabaseEnv } from "@/lib/env";

type OutfitDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OutfitDetailPage({ params }: OutfitDetailPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const { id } = await params;

  return <OutfitDetailView outfitId={decodeURIComponent(id)} />;
}
