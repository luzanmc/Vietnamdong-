import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api, type ApiError } from '../api/client.js';
import { useToast } from '../context/ToastContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { playClickSound } from '../utils/sound.js';

export default function SecureAccount() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { success: toastSuccess, error: toastError } = useToast();

  const token = params.get('token') || '';
  const initialAction = params.get('action') || 'lock';

  const [action, setAction] = useState<'lock' | 'trust'>(initialAction === 'trust' ? 'trust' : 'lock');
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [targetUsername, setTargetUsername] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setTokenValid(false);
      return;
    }

    api.getSecurityAccountToken(token)
      .then((res) => {
        setTokenValid(true);
        setTargetUsername(res.username);
      })
      .catch((err) => {
        setTokenValid(false);
        toastError((err as ApiError).message, 'Liên kết bảo mật');
      })
      .finally(() => {
        setValidating(false);
      });
  }, [token]);

  const passwordStrength = (() => {
    if (!newPassword) return 0;
    let s = 0;
    if (newPassword.length >= 8) s++;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) s++;
    if (/\d/.test(newPassword)) s++;
    if (/[^A-Za-z0-9]/.test(newPassword)) s++;
    return s;
  })();

  async function handleTrustDevice() {
    playClickSound();
    setBusy(true);
    try {
      const res = await api.trustDevice(token);
      setCompleted(true);
      setResultMessage(res.message);
      toastSuccess(res.message, 'Xác nhận thiết bị');
    } catch (err) {
      toastError((err as ApiError).message, 'Lỗi xác nhận');
    } finally {
      setBusy(false);
    }
  }

  async function handleSecureAccount(e: React.FormEvent) {
    e.preventDefault();
    playClickSound();

    if (newPassword.length < 8) {
      toastError('Mật khẩu mới phải có ít nhất 8 ký tự', 'Mật khẩu yếu');
      return;
    }

    if (newPassword !== confirmPassword) {
      toastError('Hai mật khẩu không khớp nhau', 'Lỗi mật khẩu');
      return;
    }

    setBusy(true);
    try {
      const res = await api.secureAccount(token, newPassword);
      setCompleted(true);
      setResultMessage(res.message);
      toastSuccess(res.message, 'Bảo vệ tài khoản');
    } catch (err) {
      toastError((err as ApiError).message, 'Lỗi xử lý');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`min-h-screen bg-bg text-ink flex flex-col justify-between ${theme === 'light' ? 'light-mode' : ''}`}>
      <header className="px-4 py-4 border-b border-line flex items-center justify-between max-w-4xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-base text-ink" onClick={playClickSound}>
          <img src="/logo-dark.png" alt="VietnamDong" className="w-8 h-8 rounded-xl object-contain" />
          <span>VIETNAMDONG</span>
        </Link>
        <Link
          to="/login"
          onClick={playClickSound}
          className="text-xs font-semibold text-muted hover:text-ink px-3 py-1.5 rounded-xl border border-line bg-surface hover:bg-surface2 transition"
        >
          <i className="bi bi-box-arrow-in-right mr-1.5" />
          <span>Đăng nhập</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface border border-line rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {validating ? (
            <div className="py-12 text-center space-y-3">
              <i className="bi bi-arrow-repeat animate-spin text-3xl text-indigo inline-block" />
              <p className="text-xs text-muted">Đang kiểm tra mã xác thực bảo mật...</p>
            </div>
          ) : !tokenValid ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-rose/15 text-rose flex items-center justify-center mx-auto text-3xl border border-rose/30">
                <i className="bi bi-shield-x" />
              </div>
              <h1 className="font-display font-bold text-lg text-ink">Liên kết không hợp lệ hoặc đã hết hạn</h1>
              <p className="text-xs text-muted leading-relaxed">
                Liên kết bảo vệ tài khoản này đã được sử dụng hoặc đã quá thời hạn hiệu lực 24 giờ.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full py-3 rounded-xl font-bold text-xs bg-surface2 hover:bg-line border border-line text-ink transition"
                >
                  Trở về trang đăng nhập
                </button>
              </div>
            </div>
          ) : completed ? (
            <div className="py-8 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto text-3xl border border-emerald-500/30">
                <i className="bi bi-shield-check" />
              </div>
              <h1 className="font-display font-bold text-lg text-ink">
                {action === 'trust' ? 'Xác nhận thiết bị thành công' : 'Đã bảo vệ tài khoản an toàn'}
              </h1>
              <p className="text-xs text-muted leading-relaxed">
                {resultMessage ||
                  (action === 'trust'
                    ? 'Thiết bị này đã được lưu vào danh sách tin cậy của tài khoản.'
                    : 'Toàn bộ phiên đăng nhập đã được đăng xuất. Vui lòng đăng nhập lại với mật khẩu mới.')}
              </p>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full py-3 rounded-xl font-bold text-xs bg-indigo hover:brightness-110 text-white transition shadow-md shadow-indigo/20 flex items-center justify-center gap-2"
                >
                  <i className="bi bi-box-arrow-in-right" />
                  <span>Đăng nhập ngay</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 p-1 bg-surface2 rounded-2xl border border-line">
                <button
                  type="button"
                  onClick={() => { playClickSound(); setAction('lock'); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    action === 'lock'
                      ? 'bg-rose text-white shadow-md'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  <i className="bi bi-shield-slash-fill" />
                  <span>Không phải tôi</span>
                </button>
                <button
                  type="button"
                  onClick={() => { playClickSound(); setAction('trust'); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    action === 'trust'
                      ? 'bg-indigo text-white shadow-md'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  <i className="bi bi-shield-check" />
                  <span>Đúng là tôi</span>
                </button>
              </div>

              {action === 'trust' ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 rounded-2xl bg-indigo/10 border border-indigo/25 text-xs text-muted leading-relaxed space-y-2">
                    <div className="font-bold text-indigo flex items-center gap-1.5 text-sm">
                      <i className="bi bi-check2-circle" />
                      <span>Xác nhận thiết bị hợp lệ</span>
                    </div>
                    <p>
                      Bạn đang xác nhận lần đăng nhập gần nhất vào tài khoản <strong>{targetUsername}</strong> là do chính bạn thực hiện.
                      Thiết bị này sẽ được đánh dấu là thiết bị tin cậy và không cảnh báo lại.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleTrustDevice}
                    className="w-full py-3 rounded-xl font-bold text-xs bg-indigo hover:brightness-110 text-white transition shadow-md shadow-indigo/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {busy ? (
                      <>
                        <i className="bi bi-arrow-repeat animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg text-base" />
                        <span>Xác nhận đây là thiết bị của tôi</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSecureAccount} className="space-y-4 animate-fade-in">
                  <div className="p-4 rounded-2xl bg-rose/10 border border-rose/25 text-xs text-muted leading-relaxed space-y-2">
                    <div className="font-bold text-rose flex items-center gap-1.5 text-sm">
                      <i className="bi bi-exclamation-triangle-fill" />
                      <span>Kích hoạt bảo vệ tài khoản khẩn cấp</span>
                    </div>
                    <p>
                      Hệ thống sẽ thực hiện ngay các biện pháp bảo vệ tài khoản <strong>{targetUsername}</strong>:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                      <li>Đăng xuất tất cả các thiết bị đang hoạt động.</li>
                      <li>Hủy bỏ toàn bộ yêu cầu đặt lại mật khẩu đang chờ.</li>
                      <li>Tạm khóa tính năng rút tiền trong 24 giờ.</li>
                      <li>Buộc cập nhật mật khẩu mới ngay dưới đây.</li>
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted">Mật khẩu mới</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Tối thiểu 8 ký tự"
                        required
                        className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-xs text-ink focus:outline-none focus:border-rose pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-2.5 text-muted hover:text-ink text-xs"
                      >
                        <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
                      </button>
                    </div>

                    {newPassword && (
                      <div className="flex items-center gap-1.5 pt-1">
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className={`h-1 flex-1 rounded-full transition-all ${
                              step <= passwordStrength
                                ? passwordStrength <= 2
                                  ? 'bg-amber'
                                  : 'bg-emerald-500'
                                : 'bg-line'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted">Xác nhận mật khẩu mới</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      required
                      className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-xs text-ink focus:outline-none focus:border-rose"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy || newPassword.length < 8 || newPassword !== confirmPassword}
                    className="w-full py-3 rounded-xl font-bold text-xs bg-rose hover:brightness-110 text-white transition shadow-md shadow-rose/25 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {busy ? (
                      <>
                        <i className="bi bi-arrow-repeat animate-spin" />
                        <span>Đang bảo vệ tài khoản...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-shield-lock-fill text-base" />
                        <span>Xác nhận thu hồi phiên & Đổi mật khẩu</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="px-4 py-4 text-center text-xs text-muted border-t border-line">
        VietnamDong &copy; 2026. Mọi quyền được bảo lưu.
      </footer>
    </div>
  );
}
