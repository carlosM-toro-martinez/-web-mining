import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z
    .enum(["ADMIN", "ALMACENERO", "SUPERINTENDENTE", "TRABAJADOR"])
    .optional()
    .default("TRABAJADOR"),
});
