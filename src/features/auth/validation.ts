import { z } from 'zod';

const email = z.string().email('Format email tidak valid.').max(254, 'Email maksimal 254 karakter.');
const name = z.string().trim().min(2, 'Nama minimal 2 karakter.').max(100, 'Nama maksimal 100 karakter.');

export const loginSchema = z.object({
  email,
  // LoginRequest does not impose the registration password length bounds.
  password: z.string(),
});

export const registerSchema = z.object({
  name,
  email,
  password: z.string().min(8, 'Kata sandi minimal 8 karakter.').max(72, 'Kata sandi maksimal 72 karakter.'),
});

export const profileSchema = z.object({ name });
