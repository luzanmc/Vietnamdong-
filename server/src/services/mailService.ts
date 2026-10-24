import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!env.mail.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      auth: env.mail.user ? { user: env.mail.user, pass: env.mail.pass } : undefined,
    });
  }
  return transporter;
}

function layout(title: string, bodyHtml: string): string {
  return `
  <div style="background:#0A0A0F;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#121218;border:1px solid #242430;border-radius:16px;overflow:hidden;">
      <div style="padding:24px 28px;border-bottom:1px solid #242430;">
        <span style="color:#E7E7EC;font-size:18px;font-weight:700;letter-spacing:-0.02em;">${env.appName}</span>
      </div>
      <div style="padding:28px;color:#E7E7EC;">
        <h1 style="font-size:18px;margin:0 0 12px;">${title}</h1>
        ${bodyHtml}
      </div>
      <div style="padding:16px 28px;border-top:1px solid #242430;color:#8B8B98;font-size:12px;">
        Email này được gửi tự động từ hệ thống ${env.appName}. Vui lòng không trả lời email này.
      </div>
    </div>
  </div>`;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.log(`[mail] MAIL_HOST chưa cấu hình — bỏ qua gửi email tới ${to}: ${subject}`);
    return;
  }
  await t.sendMail({ from: env.mail.from, to, subject, html });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const html = layout(
    'Đặt lại mật khẩu',
    `<p style="color:#8B8B98;font-size:14px;line-height:1.6;">
       Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản ${env.appName} của bạn.
       Liên kết bên dưới sẽ hết hạn sau 30 phút.
     </p>
     <a href="${resetUrl}" style="display:inline-block;margin-top:16px;background:#6C63F5;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;">
       Đặt lại mật khẩu
     </a>
     <p style="color:#8B8B98;font-size:12px;margin-top:20px;">
       Nếu bạn không yêu cầu điều này, hãy bỏ qua email này — mật khẩu của bạn sẽ không thay đổi.
     </p>`
  );
  await send(to, `Đặt lại mật khẩu ${env.appName}`, html);
}

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  const html = layout(
    'Xác thực địa chỉ email',
    `<p style="color:#8B8B98;font-size:14px;line-height:1.6;">
       Cảm ơn bạn đã đăng ký tài khoản ${env.appName}. Nhấn nút bên dưới để xác thực địa chỉ email này.
     </p>
     <a href="${verifyUrl}" style="display:inline-block;margin-top:16px;background:#6C63F5;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;">
       Xác thực email
     </a>`
  );
  await send(to, `Xác thực email ${env.appName}`, html);
}

export async function sendLicenseKeyEmail(to: string, licenseKey: string, apkUrl?: string): Promise<void> {
  const html = layout(
    'Cảm ơn bạn đã mua Vietsub Studio',
    `<p style="color:#8B8B98;font-size:14px;line-height:1.6;">
       Đây là license key của bạn. Vui lòng lưu lại cẩn thận, mỗi key chỉ dùng được cho 1 lần kích hoạt.
     </p>
     <div style="margin-top:16px;background:#1A1A22;border:1px solid #242430;border-radius:8px;padding:14px 18px;font-family:monospace;font-size:16px;letter-spacing:1px;color:#E7E7EC;">
       ${licenseKey}
     </div>
     ${
       apkUrl
         ? `<a href="${apkUrl}" style="display:inline-block;margin-top:16px;background:#6C63F5;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;">
              Tải app Vietsub Studio (APK)
            </a>`
         : ''
     }
     <p style="color:#8B8B98;font-size:12px;margin-top:20px;">
       Nếu gặp vấn đề khi kích hoạt, vui lòng liên hệ hỗ trợ và giữ nguyên email này làm bằng chứng mua hàng.
     </p>`
  );
  await send(to, `License key Vietsub Studio của bạn`, html);
}

export async function sendLoginAlertEmail(
  to: string,
  data: { device: string; browser: string; location: string; time: string; secureUrl: string; trustUrl: string }
): Promise<void> {
  const html = layout(
    'Cảnh báo đăng nhập từ thiết bị lạ',
    `<p style="color:#8B8B98;font-size:14px;line-height:1.6;">
       Hệ thống phát hiện một lượt đăng nhập thành công vào tài khoản ${env.appName} của bạn từ thiết bị hoặc mạng chưa từng sử dụng trước đây.
     </p>
     <div style="margin:16px 0;background:#181820;border:1px solid #282836;border-radius:10px;padding:14px 18px;font-size:13px;line-height:1.8;color:#D1D1DB;">
       <div><strong>Thiết bị:</strong> ${data.device}</div>
       <div><strong>Trình duyệt:</strong> ${data.browser}</div>
       <div><strong>Vị trí gần đúng:</strong> ${data.location}</div>
       <div><strong>Thời gian:</strong> ${data.time}</div>
     </div>
     <p style="color:#E7E7EC;font-size:14px;font-weight:600;margin-top:16px;">
       Nếu đây không phải là bạn, hãy bảo vệ tài khoản ngay lập tức:
     </p>
     <div style="margin-top:14px;display:flex;gap:12px;flex-wrap:wrap;">
       <a href="${data.secureUrl}" style="display:inline-block;background:#E11D48;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:10px 18px;border-radius:8px;margin-right:8px;">
         Không phải tôi (Bảo vệ tài khoản)
       </a>
       <a href="${data.trustUrl}" style="display:inline-block;background:#272733;color:#E7E7EC;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:8px;border:1px solid #3E3E50;">
         Đúng là tôi (Tin cậy thiết bị)
       </a>
     </div>
     <p style="color:#8B8B98;font-size:12px;margin-top:20px;line-height:1.5;">
       Liên kết bảo vệ tài khoản có hiệu lực trong 24 giờ. Nhấn "Không phải tôi" sẽ tự động đăng xuất tất cả phiên, tạm khóa rút tiền 24 giờ và yêu cầu đặt mật khẩu mới.
     </p>`
  );
  await send(to, `Cảnh báo đăng nhập lạ - ${env.appName}`, html);
}

export async function sendRecoveryCodeUsedEmail(
  to: string,
  data: { time: string; remainingCodes: number }
): Promise<void> {
  const html = layout(
    'Mã khôi phục đã được dùng',
    `<p style="color:#8B8B98;font-size:14px;line-height:1.6;">
       Một mã khôi phục xác thực 2 bước (2FA) đã được sử dụng để đăng nhập vào tài khoản ${env.appName} của bạn vào lúc ${data.time}.
     </p>
     <div style="margin:16px 0;background:#181820;border:1px solid #282836;border-radius:10px;padding:14px 18px;font-size:14px;color:#E7E7EC;">
       Số mã khôi phục còn lại: <strong style="color:${data.remainingCodes <= 2 ? '#E11D48' : '#22C55E'};">${data.remainingCodes} / 8</strong>
     </div>
     <p style="color:#8B8B98;font-size:12px;margin-top:16px;line-height:1.5;">
       ${
         data.remainingCodes <= 2
           ? '<strong style="color:#E11D48;">Cảnh báo:</strong> Bạn chỉ còn 2 mã khôi phục hoặc ít hơn. Vui lòng truy cập phần Cài đặt Bảo mật để tạo lại bộ mã mới.'
           : 'Nếu bạn không thực hiện đăng nhập này, tài khoản của bạn có thể đang gặp nguy hiểm. Hãy đổi mật khẩu và cài đặt lại xác thực 2 bước ngay.'
       }
     </p>`
  );
  await send(to, `Mã khôi phục đã được dùng - ${env.appName}`, html);
}

export async function sendCountryOtpEmail(to: string, data: { otp: string; country: string }): Promise<void> {
  const html = layout(
    'Xác minh vị trí đăng nhập',
    `<p style="color:#8B8B98;font-size:14px;line-height:1.6;">
       Chúng tôi nhận thấy yêu cầu đăng nhập từ một quốc gia mới (${data.country}). Vui lòng nhập mã xác thực bên dưới để tiếp tục:
     </p>
     <div style="margin:20px 0;background:#181820;border:1px solid #6C63F5;border-radius:10px;padding:16px 20px;font-family:monospace;font-size:24px;font-weight:700;letter-spacing:6px;color:#A5B4FC;text-align:center;">
       ${data.otp}
     </div>
     <p style="color:#8B8B98;font-size:12px;margin-top:16px;">
       Mã này có hiệu lực trong vòng 10 phút. Nếu bạn không thực hiện đăng nhập này, vui lòng bỏ qua email và xem xét đổi mật khẩu tài khoản.
     </p>`
  );
  await send(to, `Mã xác minh đăng nhập từ vị trí mới - ${env.appName}`, html);
}

export async function sendEmailLoginCode(to: string, data: { code: string }): Promise<void> {
  const html = layout(
    'Mã đăng nhập một lần',
    `<p style="color:#8B8B98;font-size:14px;line-height:1.6;">
       Bạn đã yêu cầu đăng nhập vào ${env.appName} bằng mã xác nhận qua email. Mã 6 chữ số của bạn là:
     </p>
     <div style="margin:20px 0;background:#181820;border:1px solid #6C63F5;border-radius:10px;padding:16px 20px;font-family:monospace;font-size:24px;font-weight:700;letter-spacing:6px;color:#A5B4FC;text-align:center;">
       ${data.code}
     </div>
     <p style="color:#8B8B98;font-size:12px;margin-top:16px;">
       Mã xác thực có hiệu lực trong 10 phút và tối đa 5 lần thử. Nếu bạn không yêu cầu đăng nhập, hãy bỏ qua email này.
     </p>`
  );
  await send(to, `Mã đăng nhập ${env.appName}`, html);
}

export async function sendPayoutAccountConfirmEmail(
  to: string,
  data: { bankName: string; last4: string; confirmUrl: string }
): Promise<void> {
  const html = layout(
    'Xác nhận tài khoản nhận tiền',
    `<p style="color:#8B8B98;font-size:14px;line-height:1.6;">
       Bạn vừa yêu cầu thêm tài khoản nhận tiền <strong>${data.bankName}</strong> (***${data.last4}) vào tài khoản ${env.appName}.
       Vui lòng nhấn vào nút bên dưới để xác nhận liên kết tài khoản này:
     </p>
     <div style="margin:24px 0;text-align:center;">
       <a href="${data.confirmUrl}" style="background:#6C63F5;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;display:inline-block;">
         Xác nhận liên kết tài khoản
       </a>
     </div>
     <p style="color:#8B8B98;font-size:12px;margin-top:16px;">
       Liên kết này có hiệu lực trong vòng 24 giờ. Sau khi xác nhận, tài khoản sẽ được kích hoạt bảo vệ 24 giờ trước khi có thể thực hiện rút tiền.
       Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.
     </p>`
  );
  await send(to, `Xác nhận tài khoản nhận tiền - ${env.appName}`, html);
}

export async function sendPayoutAccountConfirmedEmail(
  to: string,
  data: { bankName: string; last4: string; activeFromFormatted: string }
): Promise<void> {
  const html = layout(
    'Tài khoản nhận tiền đã được xác nhận',
    `<p style="color:#8B8B98;font-size:14px;line-height:1.6;">
       Tài khoản nhận tiền <strong>${data.bankName}</strong> (***${data.last4}) đã được xác nhận thành công.
     </p>
     <div style="margin:16px 0;background:#181820;border:1px solid #282836;border-radius:10px;padding:14px 18px;font-size:13px;color:#E7E7EC;">
       Theo chính sách an toàn, tài khoản sẽ sẵn sàng để thực hiện rút tiền vào lúc:
       <div style="margin-top:6px;font-weight:700;color:#6C63F5;font-size:15px;">${data.activeFromFormatted}</div>
     </div>
     <p style="color:#8B8B98;font-size:12px;margin-top:16px;">
       Nếu bạn không thêm tài khoản này, vui lòng truy cập trang Ví và gỡ bỏ ngay lập tức, hoặc liên hệ bộ phận hỗ trợ.
     </p>`
  );
  await send(to, `Tài khoản nhận tiền đã kích hoạt chờ 24h - ${env.appName}`, html);
}

export async function sendPayoutAccountRemovedEmail(
  to: string,
  data: { bankName: string; last4: string }
): Promise<void> {
  const html = layout(
    'Tài khoản nhận tiền đã bị xóa',
    `<p style="color:#8B8B98;font-size:14px;line-height:1.6;">
       Tài khoản nhận tiền <strong>${data.bankName}</strong> (***${data.last4}) vừa được gỡ bỏ khỏi tài khoản của bạn tại ${env.appName}.
     </p>
     <p style="color:#8B8B98;font-size:12px;margin-top:16px;">
       Nếu bạn không thực hiện thay đổi này, tài khoản của bạn có thể đã bị truy cập trái phép. Hãy đổi mật khẩu và kiểm tra lại lịch sử đăng nhập ngay lập tức.
     </p>`
  );
  await send(to, `Thông báo gỡ tài khoản nhận tiền - ${env.appName}`, html);
}

export async function sendWithdrawalOtpEmail(
  to: string,
  data: { code: string; amountNova: number; amountVnd: number; destination: string }
): Promise<void> {
  const html = layout(
    'Mã xác nhận lệnh rút tiền',
    `<p style="color:#8B8B98;font-size:14px;line-height:1.6;">
       Bạn vừa khởi tạo yêu cầu rút tiền lớn trên ${env.appName}.
     </p>
     <div style="margin:16px 0;background:#181820;border:1px solid #282836;border-radius:10px;padding:14px 18px;font-size:13px;color:#E7E7EC;line-height:1.8;">
       <div>Số tiền VNC: <strong style="color:#00F0FF;">${data.amountNova.toLocaleString('vi-VN')} VNC</strong></div>
       <div>Quy đổi ước tính: <strong>${data.amountVnd.toLocaleString('vi-VN')} VNĐ</strong></div>
       <div>Tài khoản nhận: <strong>${data.destination}</strong></div>
     </div>
     <p style="color:#8B8B98;font-size:14px;">Mã xác thực rút tiền (OTP 6 số) của bạn là:</p>
     <div style="margin:16px 0;background:#181820;border:1px solid #6C63F5;border-radius:10px;padding:14px 20px;font-family:monospace;font-size:24px;font-weight:700;letter-spacing:6px;color:#A5B4FC;text-align:center;">
       ${data.code}
     </div>
     <p style="color:#8B8B98;font-size:12px;margin-top:16px;">
       Mã có hiệu lực trong vòng 10 phút và tối đa 5 lần thử. Không chia sẻ mã này cho bất kỳ ai khác.
     </p>`
  );
  await send(to, `Mã xác nhận rút tiền - ${env.appName}`, html);
}
