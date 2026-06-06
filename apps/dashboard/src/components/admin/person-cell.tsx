/** Compact two-line identity cell (name over email). */
export function PersonCell({ name, email }: { name?: string | null; email?: string | null }) {
  if (!name && !email) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="min-w-0">
      <p className="text-foreground truncate font-medium">{name ?? '—'}</p>
      {email && <p className="text-muted-foreground truncate text-xs">{email}</p>}
    </div>
  );
}
