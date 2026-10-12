import { prisma } from "../../config/prisma.js";
import { ROL_SUPERADMIN, todosLosPermisos } from "./permisos.catalogo.js";

export interface PermisosUsuario {
  activo: boolean;
  rol: { codigo: string; nombre: string; activo: boolean } | null;
  esSuperAdmin: boolean;
  // "recurso:accion"
  permisos: Set<string>;
}

// Los permisos se leen de la base de datos (no del JWT, que dura 30 días)
// para que un cambio de rol o de permisos aplique casi de inmediato. La caché
// corta evita una consulta por request; cualquier cambio en roles, permisos o
// usuarios la vacía con invalidarCachePermisos().
const TTL_MS = 30_000;
const cache = new Map<number, { valor: PermisosUsuario; expira: number }>();

export function invalidarCachePermisos(): void {
  cache.clear();
}

export async function obtenerPermisosUsuario(userId: number): Promise<PermisosUsuario> {
  const hit = cache.get(userId);
  if (hit && hit.expira > Date.now()) return hit.valor;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      activo: true,
      rol: {
        select: {
          codigo: true,
          nombre: true,
          activo: true,
          permisos: { select: { recurso: true, accion: true } },
        },
      },
    },
  });

  let valor: PermisosUsuario;
  if (!user) {
    valor = { activo: false, rol: null, esSuperAdmin: false, permisos: new Set() };
  } else {
    const esSuperAdmin = user.rol.codigo === ROL_SUPERADMIN;
    const permisos = esSuperAdmin
      ? new Set(todosLosPermisos())
      : user.rol.activo
        ? new Set(user.rol.permisos.map((p) => `${p.recurso}:${p.accion}`))
        : new Set<string>();
    valor = {
      activo: user.activo,
      rol: { codigo: user.rol.codigo, nombre: user.rol.nombre, activo: user.rol.activo },
      esSuperAdmin,
      permisos,
    };
  }

  cache.set(userId, { valor, expira: Date.now() + TTL_MS });
  return valor;
}

export function tienePermiso(p: PermisosUsuario, recurso: string, accion: string): boolean {
  if (!p.activo) return false;
  if (p.esSuperAdmin) return true;
  return p.permisos.has(`${recurso}:${accion}`);
}
