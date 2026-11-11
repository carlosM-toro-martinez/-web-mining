import type { Response, NextFunction } from "express";
import { prisma } from "../../config/prisma.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { ROL_SUPERADMIN } from "../roles/permisos.catalogo.js";
import { obtenerPermisosUsuario, tienePermiso } from "../roles/permisos.service.js";

// Anular una compra son dos cosas distintas según lo que ya pasó con ella:
//  - Si todavía no llegó nada, solo queda marcada como anulada (no mueve stock):
//    pide "Pedidos de compra: Anular".
//  - Si ya tiene mercadería recibida, la anulación revierte el stock con
//    contra-asientos: pide "Recepción de compras: Anular".
export async function requirePermisoAnularCompra(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Token requerido" });
  }
  if (req.user.role === ROL_SUPERADMIN) return next();

  const compra = await prisma.compra.findUnique({
    where: { id: String(req.params.id) },
    select: { items: { select: { cantidadRecibida: true } } },
  });
  // Si no existe, el servicio responde 404 con su propio mensaje
  if (!compra) return next();

  const tieneRecepcion = compra.items.some((item) => Number(item.cantidadRecibida) > 0);
  const [recurso, accion] = tieneRecepcion ? ["inventario.recepcion", "anular"] : ["inventario.compras", "anular"];

  const permisos = await obtenerPermisosUsuario(req.user.id);
  if (!tienePermiso(permisos, recurso, accion)) {
    return res.status(403).json({
      success: false,
      error: tieneRecepcion
        ? "Esta compra ya tiene mercadería recibida: anularla revierte el stock y requiere el permiso de Recepción de compras: Anular"
        : "Acceso denegado",
    });
  }
  next();
}
