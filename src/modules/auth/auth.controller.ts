import type { Response } from "express";
import { authService } from "./auth.service.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";

export const authController = {
  async register(req: AuthRequest, res: Response) {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      const status = (error as any).statusCode || 400;
      const message = (error as any).message || "Error en registro";
      const details = (error as any).details;
      res.status(status).json({ success: false, message, ...(details ? { details } : {}) });
    }
  },

  async login(req: AuthRequest, res: Response) {
    try {
      const result = await authService.login(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = (error as any).statusCode || 401;
      const message = (error as any).message || "Error de autenticación";
      const details = (error as any).details;
      res.status(status).json({ success: false, message, ...(details ? { details } : {}) });
    }
  },

  async forgotPassword(req: AuthRequest, res: Response) {
    try {
      const result = await authService.forgotPassword(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = (error as any).statusCode || 400;
      const message = (error as any).message || "Error en forgot password";
      const details = (error as any).details;
      res.status(status).json({ success: false, message, ...(details ? { details } : {}) });
    }
  },

  async resetPassword(req: AuthRequest, res: Response) {
    try {
      const data = {
        token: req.query.token as string,
        password: req.body.password,
      };
      const result = await authService.resetPassword(data);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = (error as any).statusCode || 400;
      const message = (error as any).message || "Error en reset password";
      const details = (error as any).details;
      res.status(status).json({ success: false, message, ...(details ? { details } : {}) });
    }
  },

  async changePassword(req: AuthRequest, res: Response) {
    try {
      const result = await authService.changePassword(req.user!.id, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = (error as any).statusCode || 400;
      const message = (error as any).message || "Error en change password";
      const details = (error as any).details;
      res.status(status).json({ success: false, message, ...(details ? { details } : {}) });
    }
  },

  async refresh(req: AuthRequest, res: Response) {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

      if (!refreshToken) {
        return res.status(400).json({ success: false, message: "Refresh token requerido" });
      }

      const result = await authService.refresh(refreshToken);

      // Configurar cookie HttpOnly si lo deseas (opcional)
      res.cookie("accessToken", result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 3 * 60 * 60 * 1000, // 3 horas
      });

      res.json({ success: true, data: result });
    } catch (error) {
      const status = (error as any).statusCode || 401;
      const message = (error as any).message || "Error al renovar token";
      res.status(status).json({ success: false, message });
    }
  },

  async logout(req: AuthRequest, res: Response) {
    try {
      const result = await authService.logout(req.user!.id);

      // Limpiar cookies
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      res.json({ success: true, data: result });
    } catch (error) {
      const status = (error as any).statusCode || 400;
      const message = (error as any).message || "Error en logout";
      res.status(status).json({ success: false, message });
    }
  },
};
