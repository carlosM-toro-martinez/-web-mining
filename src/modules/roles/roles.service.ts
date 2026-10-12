import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../errors/http.error.js";
import { esPermisoValido, ROL_SUPERADMIN } from "./permisos.catalogo.js";
import { invalidarCachePermisos, obtenerPermisosUsuario } from "./permisos.service.js";

// "Jefe de RRHH" -> "JEFE_DE_RRHH"
function generarCodigo(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

const rolInclude = {
  permisos: { select: { recurso: true, accion: true }, orderBy: [{ recurso: "asc" as const }, { accion: "asc" as const }] },
  _count: { select: { usuarios: true } },
};

export async function listarRoles() {
  return prisma.rol.findMany({
    orderBy: [{ esSistema: "desc" }, { nombre: "asc" }],
    include: rolInclude,
  });
}

// Lista liviana para selects (asignar rol a un usuario, filtros).
export async function opcionesRoles() {
  return prisma.rol.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: { codigo: true, nombre: true },
  });
}

export async function obtenerRol(id: number) {
  const rol = await prisma.rol.findUnique({ where: { id }, include: rolInclude });
  if (!rol) throw new HttpError("Rol no encontrado", 404);
  return rol;
}

export async function crearRol(data: { nombre: string; codigo?: string | undefined; descripcion?: string | null | undefined }) {
  const codigo = generarCodigo(data.codigo?.trim() || data.nombre);
  if (!codigo) throw new HttpError("El código del rol no es válido", 400);

  const existe = await prisma.rol.findUnique({ where: { codigo }, select: { id: true } });
  if (existe) throw new HttpError(`Ya existe un rol con código "${codigo}"`, 409);

  const rol = await prisma.rol.create({
    data: {
      codigo,
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || null,
      esSistema: false,
    },
    include: rolInclude,
  });
  invalidarCachePermisos();
  return rol;
}

export async function actualizarRol(
  id: number,
  data: { nombre?: string | undefined; descripcion?: string | null | undefined; activo?: boolean | undefined },
) {
  const rol = await prisma.rol.findUnique({ where: { id } });
  if (!rol) throw new HttpError("Rol no encontrado", 404);

  // Los roles de sistema siguen siendo usados por los módulos que aún no se
  // migraron a permisos; desactivarlos dejaría el sistema en un estado mixto.
  if (data.activo === false && rol.esSistema) {
    throw new HttpError("Los roles de sistema no se pueden desactivar", 400);
  }

  const updated = await prisma.rol.update({
    where: { id },
    data: {
      ...(data.nombre !== undefined && { nombre: data.nombre.trim() }),
      ...(data.descripcion !== undefined && { descripcion: data.descripcion?.trim() || null }),
      ...(data.activo !== undefined && { activo: data.activo }),
    },
    include: rolInclude,
  });
  invalidarCachePermisos();
  return updated;
}

// Reemplaza el conjunto completo de permisos del rol.
export async function actualizarPermisosRol(id: number, permisos: Array<{ recurso: string; accion: string }>) {
  const rol = await prisma.rol.findUnique({ where: { id } });
  if (!rol) throw new HttpError("Rol no encontrado", 404);
  if (rol.codigo === ROL_SUPERADMIN) {
    throw new HttpError("El rol ADMIN tiene acceso total y sus permisos no se pueden editar", 400);
  }

  const invalidos = permisos.filter((p) => !esPermisoValido(p.recurso, p.accion));
  if (invalidos.length > 0) {
    throw new HttpError("Hay permisos que no existen en el catálogo", 400, { invalidos });
  }

  const unicos = new Map(permisos.map((p) => [`${p.recurso}:${p.accion}`, p]));

  await prisma.$transaction([
    prisma.rolPermiso.deleteMany({ where: { rolId: id } }),
    prisma.rolPermiso.createMany({
      data: [...unicos.values()].map((p) => ({ rolId: id, recurso: p.recurso, accion: p.accion })),
    }),
  ]);
  invalidarCachePermisos();
  return obtenerRol(id);
}

export async function eliminarRol(id: number) {
  const rol = await prisma.rol.findUnique({ where: { id }, include: { _count: { select: { usuarios: true } } } });
  if (!rol) throw new HttpError("Rol no encontrado", 404);
  if (rol.esSistema) throw new HttpError("Los roles de sistema no se pueden eliminar", 400);
  if (rol._count.usuarios > 0) {
    throw new HttpError(
      `No se puede eliminar: ${rol._count.usuarios} usuario(s) tienen este rol. Cámbiales el rol primero.`,
      409,
    );
  }
  await prisma.rol.delete({ where: { id } });
  invalidarCachePermisos();
}

export async function misPermisos(userId: number) {
  const p = await obtenerPermisosUsuario(userId);
  return {
    rol: p.rol,
    esSuperAdmin: p.esSuperAdmin,
    permisos: p.activo ? [...p.permisos].sort() : [],
  };
}
