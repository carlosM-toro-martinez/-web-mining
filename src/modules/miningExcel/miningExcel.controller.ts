import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { validateExcel, executeExcel } from "./miningExcel.service.js";

function getUserId(req: AuthRequest): number {
  return req.user?.id ?? 0;
}

export const miningExcelController = {
  async validate(req: AuthRequest, res: Response) {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ success: false, error: "No se recibió ningún archivo" });
      }

      const projectName = String((req.body as any).projectName ?? "").trim();
      if (!projectName) {
        return res.status(400).json({ success: false, error: "projectName es requerido" });
      }

      const defaultZoneName = String((req.body as any).defaultZoneName ?? "General").trim();
      const userId = getUserId(req);

      const result = await validateExcel(file.buffer, { projectName, defaultZoneName, userId });

      res.json({
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
        summary: result.summary,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  async execute(req: AuthRequest, res: Response) {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ success: false, error: "No se recibió ningún archivo" });
      }

      const projectName = String((req.body as any).projectName ?? "").trim();
      if (!projectName) {
        return res.status(400).json({ success: false, error: "projectName es requerido" });
      }

      const defaultZoneName = String((req.body as any).defaultZoneName ?? "General").trim();
      const userId = getUserId(req);

      const { warnings, summary } = await executeExcel(file.buffer, {
        projectName,
        defaultZoneName,
        userId,
      });

      res.status(201).json({
        success: true,
        message: "Importación completada correctamente",
        summary,
        warnings,
      });
    } catch (error: any) {
      if (error.statusCode === 422) {
        return res.status(422).json({
          success: false,
          message: error.message,
          errors: error.errors ?? [],
        });
      }
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },
};
