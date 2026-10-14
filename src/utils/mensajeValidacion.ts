import type { ZodError, ZodTypeAny, z } from "zod";

const CAMPOS: Record<string, string> = {
  municipioOrigenId: "Municipio de origen",
  municipioId: "Municipio",
  transportistaId: "Transportista",
  vehiculoId: "Vehículo",
  vehiculoNuevoId: "Vehículo nuevo",
  choferId: "Chofer",
  choferNuevoId: "Chofer nuevo",
  tipoMineralId: "Tipo de mineral",
  destinoIngenioId: "Ingenio destino",
  nivel: "Nivel",
  incluyeCombustible: "Combustible",
  combustibleAsignadoLitros: "Litros de combustible",
  combustibleEntregadoLitros: "Litros entregados",
  fechaDespachoReal: "Fecha de despacho",
  fechaDocumentalFiscal: "Fecha documental",
  conocimientoFecha: "Fecha del Conocimiento",
  detalleCarga: "Detalle de carga",
  descripcion: "Descripción",
  observaciones: "Observaciones",
  numeroCorrelativo: "N° de Conocimiento",
  tonelajeBruto: "Tonelaje bruto",
  tonelajeTara: "Tara",
  tonelajeNeto: "Neto",
  motivo: "Motivo",
  estado: "Estado",
  codigo: "Código",
  fecha: "Fecha",
  fechaInicio: "Fecha desde",
  fechaFin: "Fecha hasta",
  loteId: "Lote",
  placa: "Placa",
  nombre: "Nombre",
  nombreORazonSocial: "Nombre o razón social",
  nitOCi: "NIT o CI",
  ci: "CI",
  licencia: "Licencia",
  capacidadTon: "Capacidad (t)",
  tipo: "Tipo",
  propietarioId: "Propietario",
  monto: "Monto",
  precio: "Precio",
  anio: "Año",
  mes: "Mes",
};

function etiqueta(path: PropertyKey[]): string {
  const campo = [...path].reverse().find((p) => typeof p === "string") as string | undefined;
  return campo ? (CAMPOS[campo] ?? campo) : "";
}

// Mensaje en español para los errores que el esquema no personalizó (los
// mensajes escritos en el propio esquema tienen prioridad sobre este).
function traducir(issue: z.core.$ZodRawIssue): string {
  switch (issue.code) {
    case "invalid_type":
      if (issue.expected === "date") return "falta o no es una fecha válida";
      return issue.input === undefined || issue.input === null || issue.input === ""
        ? "es obligatorio"
        : "tiene un valor inválido";
    case "invalid_value": {
      const opciones = issue.values.map(String).join(", ");
      return issue.input === undefined || issue.input === ""
        ? `es obligatorio (elige: ${opciones})`
        : `"${String(issue.input)}" no es válido, debe ser uno de: ${opciones}`;
    }
    case "unrecognized_keys":
      return `no se reconoce el campo ${issue.keys.join(", ")}`;
    case "too_small":
      if (issue.origin === "string") return Number(issue.minimum) <= 1 ? "no puede estar vacío" : `debe tener al menos ${issue.minimum} caracteres`;
      return issue.inclusive ? `debe ser ${issue.minimum} o más` : `debe ser mayor a ${issue.minimum}`;
    case "too_big":
      if (issue.origin === "string") return `debe tener como máximo ${issue.maximum} caracteres`;
      return issue.inclusive ? `debe ser ${issue.maximum} o menos` : `debe ser menor a ${issue.maximum}`;
    case "invalid_format":
      return "tiene un formato inválido";
    default:
      return "tiene un valor inválido";
  }
}

export function validarConMensaje<T extends ZodTypeAny>(schema: T, data: unknown) {
  return schema.safeParse(data, { error: traducir });
}

// "Nivel: es obligatorio. Litros de combustible: Indica cuántos litros..."
export function mensajeDeValidacion(error: ZodError): string {
  const partes = error.issues.map((i) => {
    const campo = etiqueta(i.path);
    const clave = String(i.path.at(-1) ?? "");
    // Un id en 0 es un select que se quedó sin elegir.
    const mensaje = clave.endsWith("Id") && i.code === "too_small" ? "elígelo de la lista" : i.message;
    return campo ? `${campo}: ${mensaje}` : mensaje;
  });
  return [...new Set(partes)].join(". ");
}
