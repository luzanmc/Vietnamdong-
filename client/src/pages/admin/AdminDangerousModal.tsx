import React, { useState } from 'react';

export interface AdminDangerousModalProps {
  title: string;
  description: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (totpCode: string) => Promise<void>;
}

export default function AdminDangerousModal({
  title,
  description,
  confirmLabel = 'Xác nhận thực hiện',
  onCancel,
  onConfirm,
}: AdminDangerousModalProps) {
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!totpCode.trim()) return;
    setError('');
    setLoading(true);
    try {
      await onConfirm(totpCode.trim());
    } catch (err: any) {
      setError(err.message || 'Thao tác thất bại');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose/15 border border-rose/30 flex items-center justify-center text-rose text-lg shrink-0">
              <i className="bi bi-exclamation-triangle" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-rose">{title}</h3>
              <p className="text-[11px] text-muted">Hành động nguy hiểm yêu cầu xác nhận TOTP</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-muted hover:text-ink text-sm p-1 rounded-lg"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <p className="text-xs text-muted leading-relaxed">{description}</p>

        {error && (
          <div className="p-3 rounded-xl bg-rose/15 border border-rose/30 text-rose text-xs flex items-center gap-2">
            <i className="bi bi-exclamation-circle" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] text-muted block mb-1">Mã xác thực TOTP (6 chữ số)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-center font-mono text-lg tracking-widest focus:outline-none focus:border-rose"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-medium text-muted hover:text-ink rounded-xl border border-line"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="px-4 py-2 bg-rose hover:brightness-110 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading && <i className="bi bi-arrow-repeat animate-spin" />}
              <span>{confirmLabel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
