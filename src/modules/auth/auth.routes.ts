import { Router } from "express";
import { authController } from "./auth.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resetPasswordBodySchema,
  changePasswordSchema,
  updateUserSchema,
} from "./auth.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { requireRolOAlgunModulo } from "../../middleware/permiso.middleware.js";

const router = Router();

// Antes era público: cualquiera podía crearse un usuario (incluso ADMIN).
// Ahora solo quienes gestionan usuarios (mismos roles que /users).
router.post(
  "/register",
  authenticate,
  authorize("ADMIN", "SUPERINTENDENTE", "ALMACENERO"),
  validate(registerSchema),
  authController.register,
);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authenticate, authController.logout);
// Listado de solo lectura que alimenta los selectores de trabajador/solicitante
// de varias pantallas: además de los roles de siempre, cualquier rol con
// permisos en un módulo (se asignan en Roles y permisos) puede consultarlo.
router.get(
  "/users",
  authenticate,
  requireRolOAlgunModulo(
    ["ADMIN", "SUPERINTENDENTE", "ALMACENERO"],
    ["inventario", "personal", "logistica", "pagos", "sistema"],
  ),
  authController.listarUsuarios,
);
router.put(
  "/users/:id",
  authenticate,
  authorize("ADMIN", "SUPERINTENDENTE", "ALMACENERO"),
  validate(updateUserSchema),
  authController.actualizarUsuario,
);
router.post("/forgot-password", validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", validate(resetPasswordBodySchema), authController.resetPassword);
router.put(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword,
);

export default router;
