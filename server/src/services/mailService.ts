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
