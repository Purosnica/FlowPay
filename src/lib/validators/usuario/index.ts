import { z } from 'zod';

export const CreateUsuarioInputSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  telefono: z.string().optional(),
  idrol: z.number().int().positive('Debe seleccionar un rol'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  porcentajeComision: z
    .number()
    .min(0, 'La comisión no puede ser negativa')
    .max(100, 'La comisión no puede superar 100%')
    .default(0),
  activo: z.boolean().default(true),
  idsupervisor: z.number().int().positive().optional().nullable(),
});

export const UpdateUsuarioInputSchema = z.object({
  idusuario: z.number().int().positive(),
  nombre: z.string().min(2).optional(),
  email: z.string().email().optional(),
  telefono: z.string().nullable().optional(),
  idrol: z.number().int().positive().optional(),
  password: z.string().min(6).optional(),
  porcentajeComision: z.number().min(0).max(100).optional(),
  activo: z.boolean().optional(),
  idsupervisor: z.number().int().positive().nullable().optional(),
});

export const CreateRolInputSchema = z.object({
  codigo: z
    .string()
    .min(2, 'El código debe tener al menos 2 caracteres')
    .regex(/^[A-Z0-9_]+$/, 'Use solo mayúsculas, números y guion bajo'),
  descripcion: z.string().min(2, 'La descripción es requerida'),
  estado: z.boolean().default(true),
});

export const UpdateRolInputSchema = z.object({
  idrol: z.number().int().positive(),
  codigo: z
    .string()
    .min(2)
    .regex(/^[A-Z0-9_]+$/)
    .optional(),
  descripcion: z.string().min(2).optional(),
  estado: z.boolean().optional(),
});

export const SetPermisosRolInputSchema = z.object({
  idrol: z.number().int().positive(),
  idpermisos: z.array(z.number().int().positive()),
});

export type CreateUsuarioInput = z.infer<typeof CreateUsuarioInputSchema>;
export type UpdateUsuarioInput = z.infer<typeof UpdateUsuarioInputSchema>;
export type CreateRolInput = z.infer<typeof CreateRolInputSchema>;
export type UpdateRolInput = z.infer<typeof UpdateRolInputSchema>;
