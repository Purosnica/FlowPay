import { z } from 'zod';

export const UpdatePerfilInputSchema = z
  .object({
    nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
    email: z.string().email('Email inválido').optional(),
    telefono: z.string().nullable().optional(),
    passwordActual: z.string().optional(),
    passwordNueva: z
      .string()
      .min(6, 'La nueva contraseña debe tener al menos 6 caracteres')
      .optional(),
  })
  .refine(
    (data) => !data.passwordNueva || !!data.passwordActual,
    {
      message: 'Debe ingresar su contraseña actual para cambiarla',
      path: ['passwordActual'],
    },
  );

export type UpdatePerfilInput = z.infer<typeof UpdatePerfilInputSchema>;
