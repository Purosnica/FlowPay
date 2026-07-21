import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const mfaCodigoSchema = z.object({
  codigo: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'El código MFA debe ser de 6 dígitos'),
});

export type MfaCodigoInput = z.infer<typeof mfaCodigoSchema>;
