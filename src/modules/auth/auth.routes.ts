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

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authenticate, authController.logout);
router.get(
  "/users",
  authenticate,
  authorize("ADMIN", "SUPERINTENDENTE"),
  authController.listarUsuarios,
);
router.put(
  "/users/:id",
  authenticate,
  authorize("ADMIN", "SUPERINTENDENTE"),
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
