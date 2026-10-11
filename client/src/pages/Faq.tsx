import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext.js';

interface FaqItem {
  qVi: string;
  aVi: string;
  qEn: string;
  aEn: string;
}

const ITEMS: FaqItem[] = [
  {
    qVi: 'VDX là gì?',
    aVi: 'VDX là đơn vị tiền tệ nội bộ của VietnamDong. Bạn kiếm VDX bằng cách hoàn thành nhiệm vụ, điểm danh hằng ngày, giới thiệu bạn bè... rồi quy đổi VDX ra tiền thật hoặc thẻ cào.',
    qEn: 'What is VDX?',
    aEn: 'VDX is the internal currency of VietnamDong. You earn VDX by completing tasks, daily check-in, referring friends... then convert VDX into real money or top-up cards.',
  },
  {
    qVi: 'Làm sao để kiếm VDX?',
    aVi: 'Vào trang Tổng quan, chọn 1 nhiệm vụ rút gọn link, hoàn thành theo hướng dẫn để nhận VDX ngay. Bạn cũng có thể điểm danh hằng ngày và giới thiệu bạn bè để kiếm thêm.',
    qEn: 'How do I earn VDX?',
    aEn: 'Go to the Dashboard, pick a shortlink task, and complete it as instructed to earn VDX instantly. You can also check in daily and refer friends to earn more.',
  },
  {
    qVi: 'Tỷ giá quy đổi VDX sang VNĐ là bao nhiêu?',
    aVi: 'Tỷ giá hiện tại được hiển thị trực tiếp cạnh mỗi số VDX trên web (dạng "~X đ"). Tỷ giá có thể thay đổi theo thời gian, admin sẽ thông báo nếu có điều chỉnh.',
    qEn: 'What is the VDX to VND exchange rate?',
    aEn: 'The current rate is shown right next to every VDX amount on the site (as "~X đ"). The rate may change over time; admin will announce any adjustments.',
  },
  {
    qVi: 'Rút tiền mất bao lâu?',
    aVi: 'Mọi yêu cầu rút tiền đều cần admin duyệt thủ công để đảm bảo an toàn, thường trong vòng 24 giờ. Bạn sẽ nhận được thông báo trong app khi yêu cầu được xử lý.',
    qEn: 'How long does a withdrawal take?',
    aEn: 'All withdrawal requests require manual admin approval for safety, usually within 24 hours. You will get an in-app notification once it is processed.',
  },
  {
    qVi: 'Tại sao tôi chưa rút được tiền?',
    aVi: 'Bạn cần xác thực email trước khi rút tiền hoặc đổi thưởng (nếu đăng ký bằng email/mật khẩu). Kiểm tra hộp thư của bạn để lấy link xác thực, hoặc liên hệ Hỗ trợ nếu không thấy email.',
    qEn: 'Why can I not withdraw yet?',
    aEn: 'You need to verify your email before withdrawing or redeeming (if you signed up with email/password). Check your inbox for the verification link, or contact Support if you do not see it.',
  },
  {
    qVi: 'Tài khoản của tôi bị khóa, phải làm sao?',
    aVi: 'Hệ thống tự động tạm khóa tài khoản có dấu hiệu hoạt động bất thường để bảo vệ cả bạn và cộng đồng. Vui lòng mở 1 ticket ở trang Hỗ trợ để admin xem xét và mở khóa lại.',
    qEn: 'My account is locked, what do I do?',
    aEn: 'The system automatically locks accounts showing unusual activity to protect you and the community. Please open a ticket on the Support page so admin can review and unlock it.',
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

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
        <i className="bi bi-question-circle text-indigo" /> {lang === 'vi' ? 'Câu hỏi thường gặp' : 'Frequently Asked Questions'}
      </h1>
      <div className="space-y-2">
        {ITEMS.map((item, i) => (
          <div key={i} className="bg-surface border border-line rounded-xl overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium"
            >
              {lang === 'vi' ? item.qVi : item.qEn}
              <i className={`bi bi-chevron-${open === i ? 'up' : 'down'} text-muted shrink-0 ml-2`} />
            </button>
            {open === i && (
              <div className="px-4 pb-3 text-sm text-muted leading-relaxed">{lang === 'vi' ? item.aVi : item.aEn}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
