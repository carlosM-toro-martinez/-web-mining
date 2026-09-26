import type { Response } from "express";
import { logisticaResetService } from "./logisticaReset.service.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

export const logisticaResetController = {
  async resetTodo(req: AuthRequest, res: Response) {
    try {
      const resumen = await logisticaResetService.resetTodo(req.user!.id);
      res.json({ success: true, data: resumen });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
