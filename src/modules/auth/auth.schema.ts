import { z } from "zod";

// Los roles ahora viven en la tabla Rol (se crean desde la app), así que
// aquí solo se normaliza el código; authService valida que exista y esté
// activo. "user"/"USER" se mantiene como alias histórico de TRABAJADOR.
const roleInputSchema = z.preprocess((val) => {
  if (typeof val !== "string") return val;
  const upper = val.trim().toUpperCase();
  return upper === "USER" ? "TRABAJADOR" : upper;
}, z.string().min(1).max(50));

export const registerSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: roleInputSchema.default("TRABAJADOR"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

export const resetPasswordBodySchema = z.object({
  password: z.string().min(6),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export const updateUserSchema = z.object({
  nombre: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: roleInputSchema.optional(),
  activo: z.boolean().optional(),
});
