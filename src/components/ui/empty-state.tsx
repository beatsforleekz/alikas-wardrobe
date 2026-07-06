type EmptyStateProps = {
  title: string;
  description: string;
  compact?: boolean;
};

export function EmptyState({ title, description, compact = false }: EmptyStateProps) {
  return (
    <section
      className={`empty-state ${compact ? "is-compact" : ""}`}
      style={compact ? { minHeight: "100%" } : undefined}
    >
      <p className="eyebrow">Wardrobe</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}
