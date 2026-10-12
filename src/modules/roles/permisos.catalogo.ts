// Catálogo de permisos asignables a un rol.
//
// Un permiso es un par recurso + acción (ej. "personal.empleados" + "eliminar").
// Solo se listan aquí los módulos que YA están protegidos con requirePermiso:
// si un módulo aparece en el catálogo, marcar/desmarcar sus permisos tiene
// efecto real. Los módulos que todavía usan authorize(...roles) se irán
// agregando a medida que se migren.

export interface AccionCatalogo {
  clave: string;
  nombre: string;
}

export interface RecursoCatalogo {
  clave: string;
  nombre: string;
  descripcion?: string;
  acciones: AccionCatalogo[];
}

export interface ModuloCatalogo {
  clave: string;
  nombre: string;
  recursos: RecursoCatalogo[];
}

const VER = { clave: "ver", nombre: "Ver" };
const CREAR = { clave: "crear", nombre: "Crear" };
const EDITAR = { clave: "editar", nombre: "Editar" };
const ELIMINAR = { clave: "eliminar", nombre: "Eliminar" };

export const PERMISOS_CATALOGO: ModuloCatalogo[] = [
  {
    clave: "personal",
    nombre: "Personal",
    recursos: [
      {
        clave: "personal.empleados",
        nombre: "Empleados",
        descripcion: "\"Ver\" también es necesario para elegir empleados en horarios, ausencias y reportes.",
        acciones: [VER, CREAR, EDITAR, ELIMINAR],
      },
      {
        clave: "personal.horarios",
        nombre: "Horarios",
        acciones: [VER, CREAR, EDITAR, ELIMINAR],
      },
      {
        clave: "personal.asignaciones",
        nombre: "Asignación de horarios",
        acciones: [VER, CREAR, ELIMINAR],
      },
      {
        clave: "personal.ausencias",
        nombre: "Ausencias y vacaciones",
        acciones: [VER, CREAR, EDITAR, ELIMINAR],
      },
      {
        clave: "personal.asistencia",
        nombre: "Marcaciones y reportes de asistencia",
        acciones: [VER],
      },
      {
        clave: "personal.biometrico",
        nombre: "Biométrico",
        descripcion: "Sincronizar = traer marcaciones y reenviar empleados pendientes al dispositivo.",
        acciones: [
          { clave: "ver_estado", nombre: "Ver estado de conexión" },
          VER,
          { clave: "sincronizar", nombre: "Sincronizar" },
        ],
      },
    ],
  },
  {
    clave: "sistema",
    nombre: "Sistema",
    recursos: [
      {
        clave: "sistema.roles",
        nombre: "Roles y permisos",
        descripcion: "Quien pueda editar roles puede darse a sí mismo cualquier permiso: asignar con cuidado.",
        acciones: [VER, CREAR, EDITAR, ELIMINAR],
      },
    ],
  },
];

// Código del rol con acceso total. No depende de RolPermiso y no se puede
// editar, desactivar ni borrar: evita que el sistema quede sin administrador.
export const ROL_SUPERADMIN = "ADMIN";

const PERMISOS_VALIDOS = new Set(
  PERMISOS_CATALOGO.flatMap((m) => m.recursos.flatMap((r) => r.acciones.map((a) => `${r.clave}:${a.clave}`))),
);

export function esPermisoValido(recurso: string, accion: string): boolean {
  return PERMISOS_VALIDOS.has(`${recurso}:${accion}`);
}

export function todosLosPermisos(): string[] {
  return [...PERMISOS_VALIDOS];
}
