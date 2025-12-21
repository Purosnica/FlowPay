import { z } from "zod";

/**
 * Schemas de validación para usuarios
 */
export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "La contraseña debe contener al menos una mayúscula")
    .regex(/[a-z]/, "La contraseña debe contener al menos una minúscula")
    .regex(/[0-9]/, "La contraseña debe contener al menos un número"),
});

export const updateUserSchema = createUserSchema.partial();

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

/**
 * Schemas de validación para pagos
 */
export const createPaymentSchema = z.object({
  amount: z.number().positive("El monto debe ser positivo"),
  currency: z.string().length(3, "La moneda debe tener 3 caracteres"),
  description: z.string().max(500, "La descripción no puede exceder 500 caracteres"),
  userId: z.string().min(1, "El ID de usuario es requerido"),
});

export const updatePaymentSchema = createPaymentSchema.partial();

/**
 * Tipos TypeScript inferidos de los schemas
 */
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;











