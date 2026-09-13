interface AlertProps {
  type: 'error' | 'success';
  children: React.ReactNode;
}

export default function Alert({ type, children }: AlertProps) {
  const styles =
    type === 'error'
      ? 'bg-rose/10 border-rose/30 text-rose'
      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
  const icon = type === 'error' ? 'bi-exclamation-circle-fill' : 'bi-check-circle-fill';

  return (
    <div className={`flex items-start gap-2 border rounded-lg px-3 py-2.5 text-sm ${styles}`}>
      <i className={`bi ${icon} mt-0.5`} />
      <span>{children}</span>
    </div>
  );
}
