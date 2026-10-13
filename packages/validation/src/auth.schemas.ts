import { z } from 'zod';
import { emailSchema } from './common.schemas';

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const resetPasswordRequestSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
