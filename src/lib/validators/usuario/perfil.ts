import { z } from 'zod';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_MESSAGE,
  cumpleComplejidadPassword,
  PASSWORD_COMPLEXITY_MESSAGE,
} from '@/lib/logic/password-policy-logic';

export const UpdatePerfilInputSchema = z
  .object({
    nombre: z
      .string()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .optional(),
    email: z.string().email('Email inválido').optional(),
    telefono: z.string().nullable().optional(),
    passwordActual: z.string().optional(),
    passwordNueva: z
      .string()
      .min(PASSWORD_MIN_LENGTH, PASSWORD_MIN_MESSAGE)
      .refine(cumpleComplejidadPassword, {
        message: PASSWORD_COMPLEXITY_MESSAGE,
      })
      .optional(),
  })
  .refine((data) => !data.passwordNueva || !!data.passwordActual, {
    message: 'Debe ingresar su contraseña actual para cambiarla',
    path: ['passwordActual'],
  });

export type UpdatePerfilInput = z.infer<typeof UpdatePerfilInputSchema>;
