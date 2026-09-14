import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny } from "zod";

export const validate =
  (schema: ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      console.log("❌ VALIDATION FAILED:", result.error.flatten());
      return res.status(400).json({
        error: "Validation error",
        details: result.error.flatten(),
      });
    }

    req.body = result.data;
    next();
  };

// Compartido entre los módulos de logística (mismo bloque que ya se
// repetía inline en producto.routes.ts, vales.routes.ts, etc. — se
// extrae aquí para no seguir copiándolo módulo por módulo).
export const validateQuery =
  (schema: ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, error: "Query validation error", details: result.error.flatten() });
    }
    next();
  };

export const validateParams =
  (schema: ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, error: "Params validation error", details: result.error.flatten() });
    }
    next();
  };
