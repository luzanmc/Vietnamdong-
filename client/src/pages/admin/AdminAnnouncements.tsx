import React, { useEffect, useState } from 'react';
import { Skeleton } from '../../components/Skeleton.js';

interface Announcement {
  id: string;
  message: string;
  active: number;
  created_at: string;
}

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [loading, setLoading] = useState(true);

  const [newMsg, setNewMsg] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMsg, setEditMsg] = useState('');
  const [bannerError, setBannerError] = useState('');
  const [bannerSuccess, setBannerSuccess] = useState('');

  const [notifTarget, setNotifTarget] = useState<'single' | 'all'>('single');
  const [targetUserId, setTargetUserId] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifLink, setNotifLink] = useState('');
  const [notifError, setNotifError] = useState('');
  const [notifSuccess, setNotifSuccess] = useState('');
  const [notifSubmitting, setNotifSubmitting] = useState(false);

  async function loadAnnouncements() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/announcements', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setAnnouncements(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function handleCreateBanner(e: React.FormEvent) {
    e.preventDefault();
    const clean = newMsg.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
    if (!clean) {
      setBannerError('Nội dung thông báo không được để trống');
      return;
    }
    if (clean.length > 200) {
      setBannerError('Nội dung không được vượt quá 200 ký tự');
      return;
    }

    setBannerError('');
    setBannerSuccess('');

    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi tạo thông báo');
      setNewMsg('');
      setBannerSuccess('Đã đăng banner thông báo mới');
      loadAnnouncements();
    } catch (err: any) {
      setBannerError(err.message || 'Lỗi hệ thống');
    }
  }

  async function handleSaveEdit(id: string) {
    const clean = editMsg.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
    if (!clean) return;
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi cập nhật');
      setEditingId(null);
      loadAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Lỗi hệ thống');
    }
  }

  async function handleToggle(id: string) {
    try {
      await fetch(`/api/admin/announcements/${id}/toggle`, {
        method: 'PATCH',
        credentials: 'include',
      });
      loadAnnouncements();
    } catch {
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa banner thông báo này?')) return;
    try {
      await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      loadAnnouncements();
    } catch {
    }
  }

  async function handleSendNotification(e: React.FormEvent) {
    e.preventDefault();
    const clean = notifMessage.trim();
    if (!clean) {
      setNotifError('Nội dung thông báo không được để trống');
      return;
    }

    setNotifError('');
    setNotifSuccess('');
    setNotifSubmitting(true);

    try {
      if (notifTarget === 'single') {
        if (!targetUserId.trim()) throw new Error('Vui lòng nhập ID người dùng');
        const res = await fetch('/api/admin/notifications/send', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: targetUserId.trim(),
            message: clean,
            link: notifLink.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi gửi thông báo');
        setNotifSuccess('Đã gửi thông báo riêng thành công');
      } else {
        const res = await fetch('/api/admin/notifications/broadcast', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: clean,
            link: notifLink.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi gửi thông báo');
        setNotifSuccess(`Đã gửi thông báo tới toàn bộ ${data.count || ''} thành viên`);
      }
      setNotifMessage('');
      setTargetUserId('');
      setNotifLink('');
    } catch (err: any) {
      setNotifError(err.message || 'Lỗi hệ thống');
    } finally {
      setNotifSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <i className="bi bi-megaphone text-indigo" /> Banner thông báo đầu trang (tối đa 200 ký tự)
        </h2>

        {bannerError && (
          <div className="p-3 rounded-xl bg-rose/15 border border-rose/30 text-rose text-xs flex items-center gap-2">
            <i className="bi bi-exclamation-circle" /> {bannerError}
          </div>
        )}
        {bannerSuccess && (
          <div className="p-3 rounded-xl bg-cyan/15 border border-cyan/30 text-cyan text-xs flex items-center gap-2">
            <i className="bi bi-check-circle" /> {bannerSuccess}
          </div>
        )}

        <form onSubmit={handleCreateBanner} className="space-y-3">
          <div>
            <textarea
              rows={2}
              maxLength={200}
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              placeholder="Nhập nội dung banner hiển thị ở đầu trang..."
              className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-indigo"
              required
            />
            <div className="flex items-center justify-between text-[11px] text-muted mt-1">
              <span>Chuẩn hóa xuống dòng thành dấu cách tự động</span>
              <span className="font-mono">{newMsg.length} / 200</span>
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <i className="bi bi-plus-lg" /> Đăng banner mới
          </button>
        </form>

        <div className="space-y-2.5 pt-2">
          {loading || !announcements ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))
          ) : announcements.length === 0 ? (
            <p className="text-xs text-muted py-2">Chưa có thông báo nào.</p>
          ) : (
            announcements.map((a) => (
              <div
                key={a.id}
                className="bg-surface2 border border-line rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap"
              >
                {editingId === a.id ? (
                  <div className="flex-1 space-y-2">
                    <input
                      maxLength={200}
                      value={editMsg}
                      onChange={(e) => setEditMsg(e.target.value)}
                      className="w-full bg-surface border border-line rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveEdit(a.id)}
                        className="px-3 py-1 bg-indigo text-white rounded-lg text-[11px] font-semibold"
                      >
                        Lưu
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 border border-line text-muted rounded-lg text-[11px]"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs break-words [overflow-wrap:anywhere] ${
                          a.active ? 'text-ink' : 'text-muted line-through'
                        }`}
                      >
                        {a.message}
                      </p>
                      <span className="text-[10px] text-muted block mt-0.5">
                        {new Date(a.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setEditingId(a.id);
                          setEditMsg(a.message);
                        }}
                        className="p-1.5 rounded-lg border border-line text-muted hover:text-ink text-xs"
                      >
                        <i className="bi bi-pencil" />
                      </button>
                      <button
                        onClick={() => handleToggle(a.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                          a.active
                            ? 'bg-rose/15 border-rose/30 text-rose'
                            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        }`}
                      >
                        {a.active ? 'Tắt' : 'Bật'}
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1.5 rounded-lg border border-rose/30 bg-rose/15 text-rose text-xs"
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <i className="bi bi-bell text-cyan" /> Gửi thông báo đến thành viên (Notification Hub)
        </h2>

        {notifError && (
          <div className="p-3 rounded-xl bg-rose/15 border border-rose/30 text-rose text-xs flex items-center gap-2">
            <i className="bi bi-exclamation-circle" /> {notifError}
          </div>
        )}
        {notifSuccess && (
          <div className="p-3 rounded-xl bg-cyan/15 border border-cyan/30 text-cyan text-xs flex items-center gap-2">
            <i className="bi bi-check-circle" /> {notifSuccess}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setNotifTarget('single')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              notifTarget === 'single' ? 'bg-indigo text-white border-indigo' : 'border-line text-muted'
            }`}
          >
            <i className="bi bi-person mr-1" /> Gửi riêng 1 người
          </button>
          <button
            type="button"
            onClick={() => setNotifTarget('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              notifTarget === 'all' ? 'bg-indigo text-white border-indigo' : 'border-line text-muted'
            }`}
          >
            <i className="bi bi-people mr-1" /> Gửi cho tất cả
          </button>
        </div>

        <form onSubmit={handleSendNotification} className="space-y-3">
          {notifTarget === 'single' && (
            <div>
              <label className="text-[11px] text-muted block mb-1">ID Người nhận</label>
              <input
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="Nhập ID tài khoản người nhận"
                className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-indigo"
                required
              />
            </div>
          )}

          <div>
            <label className="text-[11px] text-muted block mb-1">Nội dung thông báo</label>
            <textarea
              rows={2}
              value={notifMessage}
              onChange={(e) => setNotifMessage(e.target.value)}
              placeholder="VD: Chúc mừng bạn đã hoàn thành nhiệm vụ đặc biệt..."
              className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-indigo"
              required
            />
          </div>

          <div>
            <label className="text-[11px] text-muted block mb-1">Đường dẫn liên kết (tùy chọn)</label>
            <input
              value={notifLink}
              onChange={(e) => setNotifLink(e.target.value)}
              placeholder="VD: /wallet hoặc /leaderboard"
              className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-indigo"
            />
          </div>

          <button
            type="submit"
            disabled={notifSubmitting}
            className="px-4 py-2 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {notifSubmitting && <i className="bi bi-arrow-repeat animate-spin" />}
            <i className="bi bi-send" /> Gửi thông báo ngay
          </button>
        </form>
      </div>
    </div>
  );
}
