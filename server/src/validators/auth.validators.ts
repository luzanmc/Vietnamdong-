import { z } from 'zod';

export const googleLoginSchema = z.object({
  credential: z.string().min(1),
});

const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
  .max(24, 'Tên đăng nhập tối đa 24 ký tự')
  .regex(/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ gồm chữ, số và dấu gạch dưới');

const passwordSchema = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .max(72, 'Mật khẩu tối đa 72 ký tự');

export const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().trim().email('Email không hợp lệ'),
  password: passwordSchema,
  captchaToken: z.string().min(1, 'Vui lòng xác thực Captcha'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  captchaToken: z.string().min(1, 'Vui lòng xác thực Captcha'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Email không hợp lệ'),
  captchaToken: z.string().min(1, 'Vui lòng xác thực Captcha'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
