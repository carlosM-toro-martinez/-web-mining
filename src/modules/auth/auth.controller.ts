import type { Request, Response } from "express";
import { authService } from "./auth.service.js";

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const result = await authService.login(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(401).json({ success: false, error: (error as Error).message });
    }
  },
};
