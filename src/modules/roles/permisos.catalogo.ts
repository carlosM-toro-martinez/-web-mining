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
    clave: "logistica",
    nombre: "Logística",
    // Las pantallas de logística se consultan datos entre sí (flota lee
    // lotes, reportes lee liquidaciones, etc.), así que LEER cualquier dato
    // del módulo requiere solo tener algún permiso "logistica.*"
    // (requireModulo). "Ver" de cada recurso controla qué pantallas y
    // opciones del menú aparecen; las acciones sí son granulares.
    recursos: [
      {
        clave: "logistica.parametros",
        nombre: "Parámetros",
        descripcion: "Municipios, tipos de mineral, ingenios, conceptos, alícuotas, tarifas y precios de combustible.",
        acciones: [VER, CREAR, EDITAR, ELIMINAR],
      },
      {
        clave: "logistica.flota",
        nombre: "Flota",
        descripcion: "Transportistas, vehículos y choferes. Editar incluye cambiar el estado de un vehículo.",
        acciones: [VER, CREAR, EDITAR, ELIMINAR],
      },
      {
        clave: "logistica.lotes",
        nombre: "Lotes de despacho",
        descripcion: "Editar incluye avanzar estado, pesaje, combustible entregado y transbordo.",
        acciones: [
          VER, CREAR, EDITAR,
          { clave: "anular", nombre: "Anular" },
          { clave: "importar", nombre: "Importar histórico" },
        ],
      },
      {
        clave: "logistica.f101",
        nombre: "Formularios 101",
        acciones: [
          VER,
          { clave: "gestionar", nombre: "Vincular / reutilizar / marcar petición" },
          { clave: "anular", nombre: "Anular" },
        ],
      },
      {
        clave: "logistica.liquidaciones",
        nombre: "Liquidaciones",
        descripcion: "Editar = agregar/quitar conceptos. Eliminar = borrar un borrador.",
        acciones: [
          VER, CREAR, EDITAR,
          { clave: "eliminar", nombre: "Eliminar borrador" },
          { clave: "cerrar", nombre: "Cerrar" },
          { clave: "anular", nombre: "Anular" },
        ],
      },
      {
        clave: "logistica.reportes",
        nombre: "Reportes y cierre mensual",
        acciones: [VER, { clave: "cerrar_mes", nombre: "Cierre mensual" }],
      },
    ],
  },
  {
    clave: "inventario",
    nombre: "Inventario",
    // "Ver" de cada recurso controla qué pantallas y opciones del menú aparecen.
    // Los datos de consulta (listas de compras, vales, productos, stock) siguen
    // abiertos a cualquier usuario autenticado porque otras pantallas los
    // necesitan; las acciones que modifican datos sí son granulares.
    // ADMIN-only (ajustes, correcciones, backfill, monitoreo) no se asigna por rol.
    recursos: [
      {
        clave: "inventario.compras",
        nombre: "Pedidos de compra",
        descripcion: "Crear pedidos a proveedores y seguirlos: si llegaron, si tienen factura o recibo. Lo que llega a almacén se confirma en Recepción de compras.",
        acciones: [
          VER, CREAR,
          { clave: "documento", nombre: "Registrar factura o recibo" },
          { clave: "anular", nombre: "Anular pedido (que aún no llegó)" },
          { clave: "ver_anulaciones", nombre: "Ver historial de pedidos anulados" },
        ],
      },
      {
        clave: "inventario.recepcion",
        nombre: "Recepción de compras",
        descripcion: "Confirmar con las cantidades reales lo que llegó de cada pedido de compra (y la fórmula de IVA). Recibir actualiza el stock; anular una compra ya recibida lo revierte.",
        acciones: [
          VER,
          { clave: "recibir", nombre: "Recibir" },
          { clave: "anular", nombre: "Anular compra ya recibida (revierte el stock)" },
          { clave: "ver_anulaciones", nombre: "Ver historial de compras recibidas anuladas" },
        ],
      },
      {
        clave: "inventario.pedidos",
        nombre: "Pedidos a proveedor",
        descripcion: "Seguimiento de órdenes de compra sin afectar el stock.",
        acciones: [VER, CREAR, { clave: "cancelar", nombre: "Cancelar" }],
      },
      {
        clave: "inventario.vales",
        nombre: "Vales de salida",
        descripcion: "Registrar, aprobar y entregar vales. Crear la solicitud de un vale está abierto a todo usuario.",
        acciones: [
          VER,
          { clave: "aprobar", nombre: "Aprobar" },
          { clave: "entregar", nombre: "Entregar" },
          { clave: "rechazar", nombre: "Rechazar" },
          { clave: "anular", nombre: "Anular" },
          { clave: "ver_resumenes", nombre: "Ver auditoría y resumen por solicitante" },
        ],
      },
      {
        clave: "inventario.vales_historicos",
        nombre: "Vales y compras históricos",
        descripcion: "Acceso a la pantalla. Para registrar cada cosa también hacen falta los permisos de Pedidos de compra (crear), Recepción (recibir) y Vales (aprobar, entregar).",
        acciones: [VER],
      },
      {
        clave: "inventario.cierre",
        nombre: "Cierre mensual",
        descripcion: "Cerrar y reabrir meses del inventario y ver los diagnósticos de saldos y precios.",
        acciones: [
          { clave: "cerrar_mes", nombre: "Cerrar mes" },
          { clave: "reabrir_mes", nombre: "Reabrir mes" },
          { clave: "diagnosticos", nombre: "Diagnósticos" },
        ],
      },
      {
        clave: "inventario.productos",
        nombre: "Productos y categorías",
        acciones: [VER, CREAR, EDITAR, ELIMINAR],
      },
      {
        clave: "inventario.proveedores",
        nombre: "Proveedores",
        acciones: [VER, CREAR, EDITAR, ELIMINAR],
      },
      {
        clave: "inventario.stock",
        nombre: "Stock y cargas",
        descripcion: "Ver stock; importar catálogo, stock y saldos y editar el stock inicial (incluye reiniciar y sincronizar el stock); registrar entradas y salidas manuales.",
        acciones: [
          VER,
          { clave: "importar", nombre: "Importar y editar stock inicial" },
          { clave: "movimientos_manuales", nombre: "Entradas y salidas manuales" },
        ],
      },
      {
        clave: "inventario.reportes",
        nombre: "Reportes",
        acciones: [VER],
      },
      {
        clave: "inventario.contabilidad",
        nombre: "Contabilidad",
        descripcion: "Editar = crear y modificar centros de costo, funciones de gasto, sectores y cuentas contables.",
        acciones: [VER, EDITAR],
      },
    ],
  },
  {
    clave: "pagos",
    nombre: "Pagos",
    recursos: [
      {
        clave: "pagos.solicitudes",
        nombre: "Solicitudes de pago",
        descripcion:
          "Registro de las solicitudes de pago a presidencia. Crear/Editar arma la solicitud; cada firma (Revisó, VºBº, Administración) y el pago tienen su propio permiso.",
        acciones: [
          VER, CREAR, EDITAR,
          { clave: "revisar", nombre: "Firmar como Revisó" },
          { clave: "visto_bueno", nombre: "Firmar el VºBº" },
          { clave: "autorizar", nombre: "Firmar como Administración" },
          { clave: "pagar", nombre: "Registrar el pago" },
          { clave: "anular", nombre: "Anular" },
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
