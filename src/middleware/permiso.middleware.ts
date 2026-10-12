import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middleware.js";
import { obtenerPermisosUsuario, tienePermiso } from "../modules/roles/permisos.service.js";

// Reemplazo de authorize(...roles) para los módulos migrados a permisos
// dinámicos. Usar después de authenticate.
//   router.delete("/:id", requirePermiso("personal.empleados", "eliminar"), ...)
export const requirePermiso = (recurso: string, accion: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Token requerido" });
    }
    const permisos = await obtenerPermisosUsuario(req.user.id);
    if (!tienePermiso(permisos, recurso, accion)) {
      return res.status(403).json({ success: false, error: "Acceso denegado" });
    }
    next();
  };
};
