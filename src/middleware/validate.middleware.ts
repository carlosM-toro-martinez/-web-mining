import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny } from "zod";
import { mensajeDeValidacion, validarConMensaje } from "../utils/mensajeValidacion.js";

// `error` lleva el motivo real (campo + qué está mal): es lo que muestra el
// frontend. `details` queda para depurar.
export const validate =
  (schema: ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => {
    const result = validarConMensaje(schema, req.body);

    if (!result.success) {
      const mensaje = mensajeDeValidacion(result.error);
      console.log("❌ VALIDATION FAILED:", req.method, req.originalUrl, mensaje);
      return res.status(400).json({
        success: false,
        error: mensaje,
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
    const result = validarConMensaje(schema, req.query);
    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, error: mensajeDeValidacion(result.error), details: result.error.flatten() });
    }
    next();
  };

export const validateParams =
  (schema: ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => {
    const result = validarConMensaje(schema, req.params);
    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, error: mensajeDeValidacion(result.error), details: result.error.flatten() });
    }
    next();
  };
