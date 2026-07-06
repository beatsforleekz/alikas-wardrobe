import { getStatusTone } from "@/lib/inventory";

type StatusBadgeProps = {
  status: string | null;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = status?.trim() || "Unknown";
  const tone = getStatusTone(label);

  return <span className={`status-badge ${tone}`}>{label}</span>;
}

