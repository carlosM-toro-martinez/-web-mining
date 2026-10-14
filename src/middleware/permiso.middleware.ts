import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middleware.js";
import { obtenerPermisosUsuario, tieneAlgunPermiso, tienePermiso } from "../modules/roles/permisos.service.js";
import { ROL_SUPERADMIN } from "../modules/roles/permisos.catalogo.js";

// Reemplazo de authorize(...roles) para los módulos migrados a permisos
// dinámicos. Usar después de authenticate.
//   router.delete("/:id", requirePermiso("personal.empleados", "eliminar"), ...)
export const requirePermiso = (recurso: string, accion: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Token requerido" });
    }
    // ADMIN tiene acceso total siempre, igual que con authorize(): no depende
    // de la tabla de permisos ni de la caché.
    if (req.user.role === ROL_SUPERADMIN) return next();

    const permisos = await obtenerPermisosUsuario(req.user.id);
    if (!tienePermiso(permisos, recurso, accion)) {
      return res.status(403).json({ success: false, error: "Acceso denegado" });
    }
    next();
  };
};

// Acceso a cualquier dato del módulo: basta con tener al menos un permiso
// "<modulo>.*". Para lecturas compartidas entre pantallas de un módulo.
//   router.get("/", requireModulo("logistica"), ...)
export const requireModulo = (modulo: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Token requerido" });
    }
    if (req.user.role === ROL_SUPERADMIN) return next();

    const permisos = await obtenerPermisosUsuario(req.user.id);
    if (!tieneAlgunPermiso(permisos, modulo)) {
      return res.status(403).json({ success: false, error: "Acceso denegado" });
    }
    next();
  };
};
