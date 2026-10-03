import { Role } from "@prisma/client";
import { z } from "zod";

// Antes era un z.enum([...]) con una lista de roles escrita a mano +
// un switch que la repetía — cada vez que se agregaba un rol nuevo al
// enum Role de Prisma (ej. ASISTENTE_ADMINISTRATIVO, MEDIOAMBIENTE,
// SEGURIDAD) había que acordarse de tocar esto también, y si no, el
// registro de un usuario con ese rol fallaba con 400 aunque el rol ya
// existiera en la base de datos. z.nativeEnum(Role) lee el enum real de
// Prisma directamente, así que nunca más se desincroniza. "user"/"USER"
// se mantiene como alias histórico de TRABAJADOR.
const roleInputSchema = z.preprocess((val) => {
  if (typeof val !== "string") return val;
  const upper = val.toUpperCase();
  return upper === "USER" ? "TRABAJADOR" : upper;
}, z.nativeEnum(Role));

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
