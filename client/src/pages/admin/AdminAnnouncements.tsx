import React, { useEffect, useState } from 'react';
import { Skeleton } from '../../components/Skeleton.js';
import type { Announcement, ScheduledEvent } from '../../types.js';

function isoToDateTimeLocal(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const local = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}

function dateTimeLocalToIso(val: string): string | null {
  if (!val) return null;
  const d = new Date(`${val}:00+07:00`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0 phút';
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  return `${minutes} phút`;
}

function getScheduleBadge(startsAt: string | null, endsAt: string | null) {
  const now = Date.now();
  const start = startsAt ? new Date(startsAt).getTime() : null;
  const end = endsAt ? new Date(endsAt).getTime() : null;

  if (start && now < start) {
    return {
      label: 'Chưa bắt đầu',
      countdown: `Bắt đầu sau ${formatDuration(start - now)}`,
      badgeClass: 'bg-amber/15 text-amber border-amber/30',
    };
  }
  if (end && now >= end) {
    return {
      label: 'Đã kết thúc',
      countdown: 'Hết hạn',
      badgeClass: 'bg-surface2 text-muted border-line',
    };
  }
  if (end) {
    return {
      label: 'Đang chạy',
      countdown: `Còn ${formatDuration(end - now)}`,
      badgeClass: 'bg-cyan/15 text-cyan border-cyan/30',
    };
  }
  return {
    label: 'Đang chạy',
    countdown: 'Không giới hạn',
    badgeClass: 'bg-cyan/15 text-cyan border-cyan/30',
  };
}

export default function AdminAnnouncements() {
  const [sectionTab, setSectionTab] = useState<'announcements' | 'events' | 'notifications'>('announcements');

  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [newMsg, setNewMsg] = useState('');
  const [newStartsAt, setNewStartsAt] = useState('');
  const [newEndsAt, setNewEndsAt] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMsg, setEditMsg] = useState('');
  const [editStartsAt, setEditStartsAt] = useState('');
  const [editEndsAt, setEditEndsAt] = useState('');
  const [bannerError, setBannerError] = useState('');
  const [bannerSuccess, setBannerSuccess] = useState('');

  const [events, setEvents] = useState<ScheduledEvent[] | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventMessage, setEventMessage] = useState('');
  const [eventType, setEventType] = useState('xp_vnc');
  const [eventMultiplier, setEventMultiplier] = useState(2);
  const [eventStartsAt, setEventStartsAt] = useState('');
  const [eventEndsAt, setEventEndsAt] = useState('');
  const [eventError, setEventError] = useState('');
  const [eventSuccess, setEventSuccess] = useState('');

  const [notifTarget, setNotifTarget] = useState<'single' | 'all'>('single');
  const [targetUserId, setTargetUserId] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifLink, setNotifLink] = useState('');
  const [notifError, setNotifError] = useState('');
  const [notifSuccess, setNotifSuccess] = useState('');
  const [notifSubmitting, setNotifSubmitting] = useState(false);

  async function loadAnnouncements() {
    setLoadingAnnouncements(true);
    try {
      const res = await fetch('/api/admin/announcements', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setAnnouncements(data);
    } catch {
    } finally {
      setLoadingAnnouncements(false);
    }
  }

  async function loadEvents() {
    setLoadingEvents(true);
    try {
      const res = await fetch('/api/admin/events', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setEvents(data);
    } catch {
    } finally {
      setLoadingEvents(false);
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

    const startIso = dateTimeLocalToIso(newStartsAt);
    const endIso = dateTimeLocalToIso(newEndsAt);
    if (startIso && endIso && new Date(endIso) <= new Date(startIso)) {
      setBannerError('Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    setBannerError('');
    setBannerSuccess('');

    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: clean,
          starts_at: startIso,
          ends_at: endIso,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi tạo thông báo');
      setNewMsg('');
      setNewStartsAt('');
      setNewEndsAt('');
      setBannerSuccess('Đã đăng banner thông báo mới');
      loadAnnouncements();
    } catch (err: any) {
      setBannerError(err.message || 'Lỗi hệ thống');
    }
  }

  async function handleSaveEdit(id: string) {
    const clean = editMsg.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
    if (!clean) return;

    const startIso = dateTimeLocalToIso(editStartsAt);
    const endIso = dateTimeLocalToIso(editEndsAt);
    if (startIso && endIso && new Date(endIso) <= new Date(startIso)) {
      alert('Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: clean,
          starts_at: startIso,
          ends_at: endIso,
        }),
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
    if (!confirm('Bạn có chắc muốn xóa thông báo này?')) return;
    try {
      await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      loadAnnouncements();
    } catch {
    }
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!eventTitle.trim()) {
      setEventError('Tiêu đề sự kiện không được để trống');
      return;
    }

    const startIso = dateTimeLocalToIso(eventStartsAt);
    const endIso = dateTimeLocalToIso(eventEndsAt);
    if (startIso && endIso && new Date(endIso) <= new Date(startIso)) {
      setEventError('Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    const clampedMult = Math.min(3, Math.max(1, Number(eventMultiplier) || 1));
    setEventError('');
    setEventSuccess('');

    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventTitle.trim(),
          message: eventMessage.trim(),
          type: eventType,
          multiplier: clampedMult,
          starts_at: startIso,
          ends_at: endIso,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi tạo sự kiện');
      setEventTitle('');
      setEventMessage('');
      setEventStartsAt('');
      setEventEndsAt('');
      setEventMultiplier(2);
      setEventSuccess('Đã tạo sự kiện nhân thưởng mới');
      loadEvents();
    } catch (err: any) {
      setEventError(err.message || 'Lỗi hệ thống');
    }
  }

  async function handleToggleEvent(id: string) {
    try {
      await fetch(`/api/admin/events/${id}/toggle`, {
        method: 'PATCH',
        credentials: 'include',
      });
      loadEvents();
    } catch {
    }
  }

  async function handleDeleteEvent(id: string) {
    if (!confirm('Bạn có chắc muốn xóa sự kiện này?')) return;
    try {
      await fetch(`/api/admin/events/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      loadEvents();
    } catch {
    }
  }

  async function handleSendNotification(e: React.FormEvent) {
    e.preventDefault();
    if (!notifMessage.trim()) {
      setNotifError('Nội dung thông báo không được để trống');
      return;
    }
    if (notifTarget === 'single' && !targetUserId.trim()) {
      setNotifError('Vui lòng nhập ID người nhận');
      return;
    }

    setNotifSubmitting(true);
    setNotifError('');
    setNotifSuccess('');

    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: notifTarget,
          userId: targetUserId.trim() || undefined,
          message: notifMessage.trim(),
          link: notifLink.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi gửi thông báo');
      setNotifSuccess(notifTarget === 'all' ? 'Đã gửi thông báo đến toàn bộ người dùng' : 'Đã gửi thông báo đến thành viên');
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
    <div className="space-y-6 max-w-4xl">
      <div className="flex gap-1.5 border-b border-line pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => {
            setSectionTab('announcements');
            loadAnnouncements();
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition ${
            sectionTab === 'announcements'
              ? 'bg-indigo text-white border border-indigo shadow-sm'
              : 'bg-surface2 text-muted hover:text-ink border border-line'
          }`}
        >
          <i className="bi bi-megaphone" /> Banner thông báo web
        </button>
        <button
          onClick={() => {
            setSectionTab('events');
            loadEvents();
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition ${
            sectionTab === 'events'
              ? 'bg-indigo text-white border border-indigo shadow-sm'
              : 'bg-surface2 text-muted hover:text-ink border border-line'
          }`}
        >
          <i className="bi bi-stars text-amber" /> Sự kiện nhân hệ số (x2 XP/VNC)
        </button>
        <button
          onClick={() => setSectionTab('notifications')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition ${
            sectionTab === 'notifications'
              ? 'bg-indigo text-white border border-indigo shadow-sm'
              : 'bg-surface2 text-muted hover:text-ink border border-line'
          }`}
        >
          <i className="bi bi-bell" /> Gửi thông báo Notification Hub
        </button>
      </div>

      {sectionTab === 'announcements' && (
        <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <i className="bi bi-megaphone text-indigo" /> Quản lý thông báo chạy trên thanh banner
            </h2>
            <p className="text-[11px] text-muted mt-0.5">
              Hỗ trợ lên lịch hiển thị theo múi giờ Việt Nam. Trạng thái hiển thị tính lúc người dùng mở trang.
            </p>
          </div>

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
              <label className="text-[11px] text-muted block mb-1">Nội dung thông báo (Tối đa 200 ký tự)</label>
              <textarea
                rows={2}
                maxLength={200}
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder="VD: Cập nhật nhiệm vụ mới với phần thưởng cực khủng từ 12:00..."
                className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-indigo"
                required
              />
              <div className="flex items-center justify-between text-[11px] text-muted mt-1">
                <span>Giới hạn 2 dòng trên màn hình người dùng</span>
                <span className="font-mono">{newMsg.length} / 200</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted block mb-1">
                  Bắt đầu hiển thị (Asia/Ho_Chi_Minh, để trống nếu ngay lập tức)
                </label>
                <input
                  type="datetime-local"
                  value={newStartsAt}
                  onChange={(e) => setNewStartsAt(e.target.value)}
                  className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-indigo"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted block mb-1">
                  Kết thúc hiển thị (Asia/Ho_Chi_Minh, để trống nếu không giới hạn)
                </label>
                <input
                  type="datetime-local"
                  value={newEndsAt}
                  onChange={(e) => setNewEndsAt(e.target.value)}
                  className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-indigo"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
            >
              <i className="bi bi-plus-lg" /> Đăng banner thông báo
            </button>
          </form>

          <div className="space-y-2.5 pt-2 border-t border-line">
            <h3 className="text-xs font-semibold text-muted uppercase">Lịch sử thông báo banner</h3>
            {loadingAnnouncements || !announcements ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))
            ) : announcements.length === 0 ? (
              <p className="text-xs text-muted py-2">Chưa có thông báo nào.</p>
            ) : (
              announcements.map((a) => {
                const schedule = getScheduleBadge(a.starts_at, a.ends_at);
                const isEditing = editingId === a.id;

                return (
                  <div
                    key={a.id}
                    className="bg-surface2 border border-line rounded-xl p-3 flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap"
                  >
                    {isEditing ? (
                      <div className="flex-1 space-y-2">
                        <textarea
                          rows={2}
                          maxLength={200}
                          value={editMsg}
                          onChange={(e) => setEditMsg(e.target.value)}
                          className="w-full bg-surface border border-line rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="datetime-local"
                            value={editStartsAt}
                            onChange={(e) => setEditStartsAt(e.target.value)}
                            className="bg-surface border border-line rounded-lg px-2 py-1 text-xs"
                          />
                          <input
                            type="datetime-local"
                            value={editEndsAt}
                            onChange={(e) => setEditEndsAt(e.target.value)}
                            className="bg-surface border border-line rounded-lg px-2 py-1 text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-1">
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
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${schedule.badgeClass}`}
                            >
                              {schedule.label}
                            </span>
                            <span className="text-[10px] text-muted">
                              <i className="bi bi-clock mr-1" />
                              {schedule.countdown}
                            </span>
                            {!a.active && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose/15 text-rose border border-rose/30">
                                Đã tắt thủ công
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-xs break-words [overflow-wrap:anywhere] ${
                              a.active ? 'text-ink' : 'text-muted line-through'
                            }`}
                          >
                            {a.message}
                          </p>
                          <div className="text-[10px] text-muted flex items-center gap-3 flex-wrap">
                            <span>Tạo: {new Date(a.created_at).toLocaleString('vi-VN')}</span>
                            {a.starts_at && (
                              <span>Từ: {new Date(a.starts_at).toLocaleString('vi-VN')}</span>
                            )}
                            {a.ends_at && (
                              <span>Đến: {new Date(a.ends_at).toLocaleString('vi-VN')}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-center">
                          <button
                            onClick={() => {
                              setEditingId(a.id);
                              setEditMsg(a.message);
                              setEditStartsAt(isoToDateTimeLocal(a.starts_at));
                              setEditEndsAt(isoToDateTimeLocal(a.ends_at));
                            }}
                            className="p-1.5 rounded-lg border border-line text-muted hover:text-ink text-xs"
                            title="Chỉnh sửa"
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
                            title="Xóa"
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {sectionTab === 'events' && (
        <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <i className="bi bi-stars text-amber text-base" /> Sự kiện nhân hệ số phần thưởng
            </h2>
            <p className="text-[11px] text-muted mt-0.5">
              Hệ số sẽ tự động nhân vào phần thưởng VNC hoặc kinh nghiệm XP khi người dùng hoàn thành link (tối đa x3.0).
            </p>
          </div>

          {eventError && (
            <div className="p-3 rounded-xl bg-rose/15 border border-rose/30 text-rose text-xs flex items-center gap-2">
              <i className="bi bi-exclamation-circle" /> {eventError}
            </div>
          )}
          {eventSuccess && (
            <div className="p-3 rounded-xl bg-cyan/15 border border-cyan/30 text-cyan text-xs flex items-center gap-2">
              <i className="bi bi-check-circle" /> {eventSuccess}
            </div>
          )}

          <form onSubmit={handleCreateEvent} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted block mb-1">Tên sự kiện</label>
                <input
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="VD: Cuối tuần nhân đôi XP & VNC"
                  className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-indigo"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-muted block mb-1">Áp dụng hệ số cho</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-indigo"
                >
                  <option value="xp_vnc">Cả XP và VNC</option>
                  <option value="vnc">Chỉ VNC</option>
                  <option value="xp">Chỉ XP</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-muted block mb-1">Mô tả sự kiện</label>
              <input
                value={eventMessage}
                onChange={(e) => setEventMessage(e.target.value)}
                placeholder="VD: Mọi lượt hoàn thành link đều được x2 phần thưởng!"
                className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-indigo"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-muted block mb-1">Hệ số nhân (1.0 - 3.0)</label>
                <input
                  type="number"
                  min="1"
                  max="3"
                  step="0.1"
                  value={eventMultiplier}
                  onChange={(e) => setEventMultiplier(Number(e.target.value))}
                  className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-indigo"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-muted block mb-1">Bắt đầu sự kiện (Asia/Ho_Chi_Minh)</label>
                <input
                  type="datetime-local"
                  value={eventStartsAt}
                  onChange={(e) => setEventStartsAt(e.target.value)}
                  className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-indigo"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted block mb-1">Kết thúc sự kiện (Asia/Ho_Chi_Minh)</label>
                <input
                  type="datetime-local"
                  value={eventEndsAt}
                  onChange={(e) => setEventEndsAt(e.target.value)}
                  className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-indigo"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
            >
              <i className="bi bi-plus-lg" /> Tạo sự kiện nhân thưởng
            </button>
          </form>

          <div className="space-y-2.5 pt-2 border-t border-line">
            <h3 className="text-xs font-semibold text-muted uppercase">Danh sách sự kiện đã tạo</h3>
            {loadingEvents || !events ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))
            ) : events.length === 0 ? (
              <p className="text-xs text-muted py-2">Chưa có sự kiện nào được tạo.</p>
            ) : (
              events.map((ev) => {
                const schedule = getScheduleBadge(ev.starts_at, ev.ends_at);
                return (
                  <div
                    key={ev.id}
                    className="bg-surface2 border border-line rounded-xl p-3 flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-ink">{ev.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber/20 text-amber border border-amber/30">
                          x{Number(ev.multiplier).toFixed(1)} {ev.type.toUpperCase()}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${schedule.badgeClass}`}
                        >
                          {schedule.label}
                        </span>
                        <span className="text-[10px] text-muted">
                          <i className="bi bi-clock mr-1" />
                          {schedule.countdown}
                        </span>
                      </div>
                      {ev.message && <p className="text-xs text-muted">{ev.message}</p>}
                      <div className="text-[10px] text-muted flex items-center gap-3 flex-wrap">
                        {ev.starts_at && (
                          <span>Từ: {new Date(ev.starts_at).toLocaleString('vi-VN')}</span>
                        )}
                        {ev.ends_at && (
                          <span>Đến: {new Date(ev.ends_at).toLocaleString('vi-VN')}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-center">
                      <button
                        onClick={() => handleToggleEvent(ev.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                          ev.enabled
                            ? 'bg-rose/15 border-rose/30 text-rose'
                            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        }`}
                      >
                        {ev.enabled ? 'Tắt' : 'Bật'}
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="p-1.5 rounded-lg border border-rose/30 bg-rose/15 text-rose text-xs"
                        title="Xóa sự kiện"
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {sectionTab === 'notifications' && (
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
      )}
    </div>
  );
}
