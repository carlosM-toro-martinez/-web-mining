import { z } from "zod";

export const registerSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z
    .enum(["admin", "user", "ADMIN", "USER", "ALMACENERO", "SUPERINTENDENTE", "TRABAJADOR", "VISITANTE", "GEOLOGOADMIN", "GEOLOGO", "ADMINISTRADOR"])
    .default("TRABAJADOR")
    .transform((val) => {
      switch (val.toUpperCase()) {
        case "ADMIN":
          return "ADMIN";
        case "ALMACENERO":
          return "ALMACENERO";
        case "SUPERINTENDENTE":
          return "SUPERINTENDENTE";
        case "VISITANTE":
          return "VISITANTE";
        case "GEOLOGOADMIN":
          return "GEOLOGOADMIN";
        case "GEOLOGO":
          return "GEOLOGO";
        case "ADMINISTRADOR":
          return "ADMINISTRADOR";
        case "TRABAJADOR":
        case "USER":
        default:
          return "TRABAJADOR";
      }
    }),
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
  role: z
    .enum(["admin", "user", "ADMIN", "USER", "ALMACENERO", "SUPERINTENDENTE", "TRABAJADOR", "VISITANTE", "GEOLOGOADMIN", "GEOLOGO", "ADMINISTRADOR"])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      switch (val.toUpperCase()) {
        case "ADMIN":
          return "ADMIN";
        case "ALMACENERO":
          return "ALMACENERO";
        case "SUPERINTENDENTE":
          return "SUPERINTENDENTE";
        case "VISITANTE":
          return "VISITANTE";
        case "GEOLOGOADMIN":
          return "GEOLOGOADMIN";
        case "GEOLOGO":
          return "GEOLOGO";
        case "ADMINISTRADOR":
          return "ADMINISTRADOR";
        case "TRABAJADOR":
        case "USER":
        default:
          return "TRABAJADOR";
      }
    }),
  activo: z.boolean().optional(),
});
