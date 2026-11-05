import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type ApiError } from '../api/client.js';
import Alert from '../components/Alert.js';
import { Skeleton } from '../components/Skeleton.js';
import { useToast } from '../context/ToastContext.js';
import { playClickSound } from '../utils/sound.js';
import BalanceCard from '../components/BalanceCard.js';
import TurnstileWidget from '../components/TurnstileWidget.js';
import type { Me, Wallet, Task } from '../types.js';

export default function Dashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'hot' | 'available'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [challengeTaskId, setChallengeTaskId] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  const { error: toastError } = useToast();

  async function load() {
    try {
      const [meData, walletData, taskData] = await Promise.all([
        api.me(),
        api.wallet(),
        api.tasks(),
      ]);
      setMe(meData);
      setWallet(walletData);
      setTasks(taskData);
    } catch (e) {
      setError((e as ApiError).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleStart(taskId: string, captchaToken?: string) {
    setBusyId(taskId);
    setError(null);
    try {
      const { shortUrl } = await api.startTask(taskId, captchaToken);
      setChallengeTaskId(null);
      window.open(shortUrl, '_blank', 'noopener');
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 428) {
        setChallengeTaskId(taskId);
        setCaptchaReset((prev) => prev + 1);
        return;
      }
      const msg = err.message;
      setError(msg);
      toastError(msg, 'Không thể mở nhiệm vụ');
    } finally {
      setBusyId(null);
    }
  }

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'hot') return !!t.is_hot;
    if (filter === 'available') return t.done_today < t.daily_limit;
    return true;
  });

  const doneCount = tasks.filter((t) => t.done_today >= t.daily_limit).length;

  if (error && !me) {
    return (
      <div className="pg" style={{ maxWidth: '480px', margin: '40px auto' }}>
        <Alert type="error">{error}</Alert>
        <button
          onClick={() => {
            setError(null);
            load();
          }}
          className="btn"
          style={{ marginTop: '16px' }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="pg" id="pg-dashboard">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <div className="stats">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
        <div className="two">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        <div className="tasks">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pg" id="pg-dashboard">
      {/* 1. Welcome Card */}
      <section className="card wel">
        <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
          <span className="mu" style={{ fontSize: '13px' }}>Xin chào,</span>
          <b style={{ fontSize: '18px' }}>{me.username}</b>
          <span className="tag" style={{ marginLeft: 0 }}>Lv.{me.level ?? 1}</span>
          <span className="tag" style={{ background: '#d8f6ea', color: '#0e9f6e' }}>● Hệ thống 24/7</span>
        </div>
        <p className="mu" style={{ marginTop: '6px', fontSize: '13px' }}>
          Hoàn thành nhiệm vụ vượt link để tích lũy VNC và quy đổi tiền mặt tức thì.
        </p>
      </section>

      {/* 2. Blue Card (Balance + BalanceCard on right) */}
      <section className="card blue bc">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ opacity: 0.85 }}>Số dư khả dụng</div>
            <div className="big">
              <span id="bal">{(wallet?.balance_nova ?? 0).toLocaleString('vi-VN')}</span>
              <small>VNC</small>
            </div>
            <div style={{ opacity: 0.85, marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
              ≈ <span id="vnd">{(wallet?.balance_vnd ?? 0).toLocaleString('vi-VN')}</span> VNĐ
            </div>
          </div>
          <div className="row">
            <Link className="btn wh" to="/wallet" onClick={playClickSound}>
              <svg className="i"><use href="#up" /></svg>Rút tiền
            </Link>
            <Link className="btn glass" to="/giftcode" onClick={playClickSound}>
              <svg className="i"><use href="#ticket" /></svg>Giftcode
            </Link>
            <Link className="btn glass" to="/redeem" onClick={playClickSound}>
              <svg className="i"><use href="#gift" /></svg>Đổi thưởng
            </Link>
          </div>
        </div>

        {/* Right column: Virtual Card matching vnccard.html / BalanceCard */}
        <div style={{ width: '100%', maxWidth: '320px', margin: '0 auto' }}>
          <BalanceCard
            novaAmount={wallet?.balance_nova}
            vndAmount={wallet?.balance_vnd}
            label="Số dư khả dụng"
            cardId={me?.card_id || undefined}
          />
        </div>
      </section>

      {/* 3. Stats section */}
      <section className="stats">
        <div className="card st">
          <div className="si"><svg className="i"><use href="#bolt" /></svg></div>
          <div>
            <small>Nhiệm vụ xong</small>
            <b id="sDone">{doneCount}/{tasks.length}</b>
          </div>
        </div>
        <div className="card st">
          <div className="si a"><svg className="i"><use href="#flame" /></svg></div>
          <div>
            <small>Chuỗi streak</small>
            <b id="sStreak">{me.streak_days ?? 0} ngày</b>
          </div>
        </div>
        <div className="card st">
          <div className="si p"><svg className="i"><use href="#crown" /></svg></div>
          <div>
            <small>Cấp VIP</small>
            <b>Lv.{me.level ?? 1}</b>
          </div>
        </div>
        <div className="card st">
          <div className="si g"><svg className="i"><use href="#bar" /></svg></div>
          <div>
            <small>Kinh nghiệm</small>
            <b id="sXp">{(me.xp ?? 0).toLocaleString('vi-VN')} XP</b>
          </div>
        </div>
      </section>

      {/* 4. Two columns: Daily Check-in & VIP Progress */}
      <section className="two">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="si a"><svg className="i"><use href="#cal" /></svg></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>Điểm danh hằng ngày</b>
            <p style={{ color: 'var(--mute)', fontSize: '12px', marginTop: '2px' }}>
              Nhận quà và mở khóa thưởng x2
            </p>
          </div>
          <Link className="btn" to="/daily-reward" onClick={playClickSound} id="checkin">
            Điểm danh
          </Link>
        </div>
        <div className="card">
          <div className="hd">
            <b style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <svg className="i" style={{ color: 'var(--pri)' }}><use href="#trophy" /></svg>
              Tiến độ VIP cấp {me.level ?? 1}
            </b>
            <Link
              to="/profile"
              onClick={playClickSound}
              style={{ color: 'var(--pri)', fontWeight: 600, fontSize: '13px', textDecoration: 'none' }}
            >
              Đặc quyền
            </Link>
          </div>
          <div className="bar">
            <i id="xpb" style={{ width: `${Math.min(100, me.levelProgress?.progressPercent ?? 0)}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mute)', fontSize: '12px' }}>
            <span>Tiến độ kinh nghiệm</span>
            <span id="xpt">
              {(me.xp ?? 0).toLocaleString('vi-VN')} / {(me.levelProgress?.nextLevelXp ?? 'Max').toLocaleString()} XP
            </span>
          </div>
        </div>
      </section>

      {/* 5. Tasks Section */}
      <section>
        <div className="hd">
          <div>
            <h2>
              <svg className="i" style={{ color: 'var(--pri)' }}><use href="#bolt" /></svg>
              Nhiệm vụ vượt link hôm nay
            </h2>
            <p>Bấm “Làm ngay” để nhận VNC sau khi vượt link.</p>
          </div>
          <div className="seg" id="seg">
            <button
              data-f="all"
              className={filter === 'all' ? 'on' : ''}
              onClick={() => {
                playClickSound();
                setFilter('all');
              }}
            >
              Tất cả
            </button>
            <button
              data-f="hot"
              className={filter === 'hot' ? 'on' : ''}
              onClick={() => {
                playClickSound();
                setFilter('hot');
              }}
            >
              HOT
            </button>
            <button
              data-f="av"
              className={filter === 'available' ? 'on' : ''}
              onClick={() => {
                playClickSound();
                setFilter('available');
              }}
            >
              Còn lượt
            </button>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: '12px' }}>
            <Alert type="error">{error}</Alert>
          </div>
        )}

        <div className="tasks" id="tasks">
          {filteredTasks.length === 0 ? (
            <div className="empty">
              <svg className="i" style={{ width: '36px', height: '36px' }}><use href="#inbox" /></svg>
              <p style={{ marginTop: '8px' }}>Không có nhiệm vụ phù hợp</p>
            </div>
          ) : (
            filteredTasks.map((t) => {
              const full = t.done_today >= t.daily_limit;
              const busy = busyId === t.id;
              return (
                <div key={t.id} className="card tk">
                  <div className="h">
                    <div className="si"><svg className="i"><use href="#link" /></svg></div>
                    <div>
                      <h3>{t.name}</h3>
                      <small>Tối thiểu {t.min_seconds || 15}s</small>
                    </div>
                    {t.is_hot ? (
                      <span className="hot">
                        <svg className="i"><use href="#flame" /></svg>HOT
                      </span>
                    ) : null}
                  </div>
                  <div className="rw">
                    <span>Phần thưởng</span>
                    <b>+{t.reward_nova.toLocaleString('vi-VN')} VNC</b>
                  </div>
                  <div>
                    <div className="bar" style={{ margin: '0 0 6px' }}>
                      <i style={{ width: `${Math.min(100, (t.done_today / t.daily_limit) * 100)}%` }} />
                    </div>
                    <div className="rw">
                      <span>Hôm nay</span>
                      <span>{t.done_today}/{t.daily_limit} lượt</span>
                    </div>
                  </div>
                  <button
                    className="btn"
                    disabled={full || busy}
                    onClick={() => {
                      playClickSound();
                      handleStart(t.id);
                    }}
                  >
                    {full ? (
                      'Đã hết lượt'
                    ) : busy ? (
                      'Đang mở link...'
                    ) : (
                      <>
                        Làm ngay
                        <svg className="i"><use href="#arr" /></svg>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Security Challenge Modal */}
      {challengeTaskId && (
        <div className="mod open" id="mod">
          <div className="card mb">
            <div className="hd">
              <b style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <svg className="i" style={{ color: 'var(--pri)' }}><use href="#shield" /></svg>
                Xác minh bảo mật
              </b>
              <button className="col" id="mx" aria-label="Đóng" onClick={() => setChallengeTaskId(null)}>
                <svg className="i"><use href="#x" /></svg>
              </button>
            </div>
            <p style={{ color: 'var(--mute)', fontSize: '13px', lineHeight: 1.5 }}>
              Hệ thống cần xác minh trước khi cấp link nhiệm vụ. Bấm vào ô bên dưới.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
              <TurnstileWidget
                reset={captchaReset}
                onToken={(token) => {
                  if (token) {
                    handleStart(challengeTaskId, token);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
