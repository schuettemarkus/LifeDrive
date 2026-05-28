export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="px-4 pt-6">
      {eyebrow && (
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">{eyebrow}</p>
      )}
      <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight text-balance">
        {title}
      </h1>
      {description && <p className="mt-2 text-sm text-white/55">{description}</p>}
    </header>
  );
}
