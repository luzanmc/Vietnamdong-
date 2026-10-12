import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext.js';
import { playClickSound } from '../utils/sound.js';

interface FaqItem {
  qVi: string;
  aVi: string;
  qEn: string;
  aEn: string;
}

const ITEMS: FaqItem[] = [
  {
    qVi: 'VNC là gì?',
    aVi: 'VNC là đơn vị tiền tệ nội bộ của VietnamDong. Bạn kiếm VNC bằng cách hoàn thành nhiệm vụ, điểm danh hằng ngày, quay vòng quay may mắn, giới thiệu bạn bè... rồi quy đổi VNC ra tiền thật qua MoMo, Ngân hàng hoặc thẻ cào.',
    qEn: 'What is VNC?',
    aEn: 'VNC is the internal currency of VietnamDong. You earn VNC by completing tasks, daily check-in, spinning lucky wheel, referring friends... then convert VNC into real money via MoMo, Bank, or game cards.',
  },
  {
    qVi: 'Làm sao để kiếm VNC nhanh nhất?',
    aVi: 'Vào trang Tổng quan, chọn các nhiệm vụ rút gọn link có gắn nhãn "HOT" để nhận nhiều VNC nhất. Đồng thời giữ streak điểm danh 7 ngày để x2 phần thưởng và mời bạn bè để nhận hoa hồng 20% vĩnh viễn.',
    qEn: 'How do I earn VNC fastest?',
    aEn: 'Visit the Dashboard and select tasks marked "HOT" for the highest rewards. Keep a 7-day check-in streak to maximize bonuses, and invite friends for permanent 20% commission.',
  },
  {
    qVi: 'Tỷ giá quy đổi VNC sang VNĐ là bao nhiêu?',
    aVi: 'Tỷ giá hiện tại được hiển thị trực tiếp cạnh mỗi số VNC trên web (dạng "~X đ"). Tỷ giá có thể thay đổi theo thời gian, admin sẽ thông báo nếu có điều chỉnh.',
    qEn: 'What is the VNC to VND exchange rate?',
    aEn: 'The current rate is shown right next to every VNC amount on the site (as "~X đ"). The rate may change over time; admin will announce any adjustments.',
  },
  {
    qVi: 'Rút tiền mất bao lâu?',
    aVi: 'Mọi yêu cầu rút tiền đều được admin duyệt và thanh toán nhanh chóng, thường trong vòng 2 - 24 giờ. Bạn sẽ nhận được thông báo trong app ngay khi tiền được gửi.',
    qEn: 'How long does a withdrawal take?',
    aEn: 'All withdrawal requests are processed quickly by admin, usually within 2 to 24 hours. You will receive an in-app notification once completed.',
  },
  {
    qVi: 'Tại sao tôi chưa rút được tiền?',
    aVi: 'Bạn cần xác thực email trước khi rút tiền hoặc đổi thưởng (nếu đăng ký bằng email/mật khẩu). Kiểm tra hộp thư của bạn để lấy link xác thực, hoặc liên hệ Hỗ trợ nếu không thấy email.',
    qEn: 'Why can I not withdraw yet?',
    aEn: 'You need to verify your email before withdrawing or redeeming (if you signed up with email/password). Check your inbox for the verification link, or contact Support if you do not see it.',
  },
  {
    qVi: 'Tài khoản của tôi bị khóa, phải làm sao?',
    aVi: 'Hệ thống tự động tạm khóa tài khoản có dấu hiệu hoạt động bất thường hoặc sử dụng bot/cheat để bảo vệ cộng đồng. Vui lòng mở 1 ticket ở trang Hỗ trợ để admin xem xét và mở khóa lại.',
    qEn: 'My account is locked, what do I do?',
    aEn: 'The system automatically locks accounts showing unusual activity to protect the community. Please open a ticket on the Support page so admin can review and unlock it.',
  },
  {
    qVi: 'Creator Code là gì?',
    aVi: 'Nếu bạn có Creator Code do admin cấp, người dùng nhập code đó sẽ giúp bạn nhận thêm % hoa hồng trên mỗi nhiệm vụ họ hoàn thành, tương tự chương trình giới thiệu nhưng dành cho creator/KOL.',
    qEn: 'What is a Creator Code?',
    aEn: 'If you have a Creator Code issued by admin, users who enter it will earn you a bonus % commission on every task they complete — similar to referrals but for creators/KOLs.',
  },
];

export default function Faq() {
  const { lang } = useLanguage();
  const [open, setOpen] = useState<number | null>(0);
  const [search, setSearch] = useState('');

  const filtered = ITEMS.filter((item) => {
    const q = lang === 'vi' ? item.qVi : item.qEn;
    const a = lang === 'vi' ? item.aVi : item.aEn;
    return q.toLowerCase().includes(search.toLowerCase()) || a.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo/15 text-indigo border border-indigo/30 mb-2">
          <i className="bi bi-question-circle-fill" />
          <span>Trung tâm giải đáp</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center gap-2">
          {lang === 'vi' ? 'Câu hỏi thường gặp' : 'Frequently Asked Questions'}
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          Tổng hợp câu trả lời cho các thắc mắc phổ biến nhất khi tham gia VietnamDong.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={lang === 'vi' ? 'Tìm kiếm câu hỏi...' : 'Search questions...'}
          className="w-full bg-surface2 border border-line rounded-2xl px-4 py-3 pl-11 text-sm text-ink focus:outline-none focus:border-indigo"
        />
        <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none" />
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center text-muted">
            Không tìm thấy câu hỏi phù hợp với "{search}".
          </div>
        ) : (
          filtered.map((item, i) => {
            const isOpen = open === i;

            return (
              <div
                key={i}
                className="glass-card rounded-2xl border border-line overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => {
                    playClickSound();
                    setOpen(isOpen ? null : i);
                  }}
                  className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-semibold text-ink hover:text-indigo transition gap-3 btn-press"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-indigo/15 text-indigo font-bold text-xs flex items-center justify-center shrink-0">
                      ?
                    </span>
                    <span>{lang === 'vi' ? item.qVi : item.qEn}</span>
                  </span>
                  <i
                    className={`bi bi-chevron-down text-muted text-xs shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180 text-indigo' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-muted leading-relaxed border-t border-line/40 pt-3 animate-slide-in">
                    {lang === 'vi' ? item.aVi : item.aEn}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
