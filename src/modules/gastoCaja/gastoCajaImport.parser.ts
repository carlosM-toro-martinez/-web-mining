import XLSX from "xlsx";

// Parser del reporte mensual "CAJA LIPEÑA" (fondos recibidos + detalle de
// gastos) tal como se arma hoy a mano en Excel. A diferencia del Cuadro de
// Envío de Logística (una sola tabla con un encabezado de columnas), este
// documento es un reporte CONTABLE con dos secciones de forma distinta:
//
//   1. "FONDOS RECIBIDOS": una tabla chica (fecha, código CH-xxx,
//      descripción, Bs DEBE/HABER) que termina en una fila "TOTAL".
//   2. "DETALLE DE GASTOS": una tabla larga dividida en sub-secciones por
//      categoría (MATERIALES Y SUMINISTROS, TRANSPORTES, ...) — cada
//      categoría es un título de fila suelto, seguido de filas
//      DESCRIPCION/FACTURA O RECIBO/IMPORTE, y cerrada con una fila
//      "SUB TOTAL".
//
// Como no hay un único encabezado de columnas fijo, esto se recorre como
// una máquina de estados: cada fila se clasifica por su CONTENIDO (título
// de sección, fila de corte "TOTAL"/"SUB TOTAL", o fila de datos) en vez de
// por su posición. Las categorías de "DETALLE DE GASTOS" coinciden EXACTO
// con el enum CategoriaRendicionGasto (ver CATEGORIA_LABEL en
// reportesCajaChica.service.ts) — por eso se puede derivar directo del
// título de cada sub-sección, sin que el usuario tenga que elegirlas a mano.

export type CategoriaRendicionGastoTexto =
  | "MATERIALES_SUMINISTROS"
  | "TRANSPORTES"
  | "ACTIVOS_FIJOS"
  | "MANTENIMIENTO_SERVICIOS"
  | "OBLIGACIONES_SOCIALES"
  | "OBRAS_CONSTRUCCION"
  | "GASTOS_ADMINISTRATIVOS"
  | "OTROS_GASTOS_ADMINISTRATIVOS"
  | "OTROS"
  | "MEDIO_AMBIENTE";

// Mismo texto exacto que CATEGORIA_LABEL en reportesCajaChica.service.ts —
// se duplica a propósito (son archivos distintos, nunca se cruzan imports
// de helpers privados entre módulos, mismo criterio ya usado en los demás
// parsers/exportadores de este proyecto).
const CATEGORIA_POR_TITULO: Record<string, CategoriaRendicionGastoTexto> = {
  "MATERIALES Y SUMINISTROS": "MATERIALES_SUMINISTROS",
  TRANSPORTES: "TRANSPORTES",
  "ACTIVOS FIJOS": "ACTIVOS_FIJOS",
  "MANTENIMIENTO Y OTROS SERVICIOS": "MANTENIMIENTO_SERVICIOS",
  "OBLIGACIONES SOCIALES": "OBLIGACIONES_SOCIALES",
  "OBRAS EN CONSTRUCCION": "OBRAS_CONSTRUCCION",
  "GASTOS ADMINISTRATIVOS": "GASTOS_ADMINISTRATIVOS",
  "OTROS GASTOS ADMINISTRATIVOS": "OTROS_GASTOS_ADMINISTRATIVOS",
  OTROS: "OTROS",
  "MEDIO AMBIENTE": "MEDIO_AMBIENTE",
};

const MESES: Record<string, number> = {
  ENERO: 1,
  FEBRERO: 2,
  MARZO: 3,
  ABRIL: 4,
  MAYO: 5,
  JUNIO: 6,
  JULIO: 7,
  AGOSTO: 8,
  SEPTIEMBRE: 9,
  SETIEMBRE: 9,
  OCTUBRE: 10,
  NOVIEMBRE: 11,
  DICIEMBRE: 12,
};

export interface FilaFondoExcel {
  fila: number;
  fecha: Date | null;
  referencia: string;
  descripcion: string;
  monto: number | null;
}

export interface FilaGastoExcel {
  fila: number;
  categoriaRendicion: CategoriaRendicionGastoTexto;
  descripcion: string;
  facturaORecibo: string;
  monto: number | null;
}

export interface ResultadoParseoCajaChica {
  mes: number | null;
  anio: number | null;
  fondos: FilaFondoExcel[];
  gastos: FilaGastoExcel[];
}

function norm(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

// Igual idea que parseNumeroExcel en loteDespachoImport.parser.ts, pero acá
// el documento usa el formato "8,000.00" (coma de miles, punto decimal) en
// vez del punto-de-miles boliviano — se limpia cualquier símbolo que no sea
// dígito/signo/punto antes de interpretar la coma como separador de miles.
function parseMonto(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "number") return isNaN(raw) ? null : raw;
  const limpio = String(raw).trim().replace(/[^0-9.,-]/g, "");
  if (!limpio) return null;
  const n = parseFloat(limpio.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

// Fechas de "FONDOS RECIBIDOS" ("03/09/2026"): el documento es boliviano
// (DD/MM/AAAA), y el mes declarado en "MES DE: ..." lo confirma — si el
// primer número no puede ser día (>31) o si interpretarlo como DD/MM da un
// mes que no calza con ninguno válido, cae a MM/DD como red de seguridad.
function parseFechaDDMM(raw: unknown): Date | null {
  if (raw instanceof Date) return new Date(Date.UTC(raw.getFullYear(), raw.getMonth(), raw.getDate()));
  if (typeof raw !== "string") return null;
  const match = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;
  const [, dStr, mStr, yStr] = match;
  const d = Number(dStr);
  const m = Number(mStr);
  let anio = Number(yStr);
  if (anio < 100) anio += 2000;

  if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return new Date(Date.UTC(anio, m - 1, d));
  if (d >= 1 && d <= 12 && m >= 1 && m <= 31) return new Date(Date.UTC(anio, d - 1, m));
  return null;
}

// Se compara contra la PRIMERA celda no vacía de la fila (no contra todo el
// texto junto): una fila de corte real casi siempre trae un monto en otra
// columna ("TOTAL", "", 665454.84), así que compararla entera ("TOTAL
// 665454.84") nunca iba a calzar con el texto esperado.
function primeraCeldaNoVacia(row: unknown[]): string {
  for (const c of row) {
    const texto = norm(c);
    if (texto) return texto;
  }
  return "";
}

// "SUB TOTAL"/"SUB-TOTAL": cierra solo la categoría actual, sigue en la
// misma sección (FONDOS o GASTOS).
function esSubTotal(primeraCelda: string): boolean {
  return (
    primeraCelda.startsWith("SUB TOTAL") || primeraCelda.startsWith("SUB-TOTAL") || primeraCelda.startsWith("SUBTOTAL")
  );
}

// "TOTAL" a secas (fondos) o "TOTAL GASTOS EN EL MES" (gastos): cierra TODA
// la sección — de acá para abajo es pie de página (saldo, firmas, "MINA
// LIPEÑA, SEPTIEMBRE 2026"...). Antes esto se filtraba con una lista de
// palabras sueltas (MINA LIPE, ADMINISTRADOR...) que terminó descartando
// por error un gasto real cuya glosa mencionaba "CAMPAMENTO MINA LIPEÑA" —
// cerrar la sección por estado, no por contenido, es inmune a eso: una vez
// fuera de FONDOS/GASTOS, nada se procesa sin importar qué diga la fila.
function esTotalFinal(primeraCelda: string): boolean {
  return primeraCelda === "TOTAL" || primeraCelda.startsWith("TOTAL GASTOS") || primeraCelda.startsWith("TOTAL LIQUIDO");
}

export function parseCajaChicaExcel(buffer: Buffer): ResultadoParseoCajaChica {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]!];
  if (!sheet) throw new Error("El archivo Excel está vacío o no tiene hojas.");

  const filas = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  // --- Mes/año del reporte: fila "MES DE: SEPTIEMBRE DEL 2026" ---
  let mes: number | null = null;
  let anio: number | null = null;
  for (const fila of filas) {
    const texto = fila.map((c) => norm(c)).join(" ");
    const match = texto.match(/MES DE[:\s]+([A-ZÑ]+).*?(\d{4})/) ?? texto.match(/([A-ZÑ]+)\s+DEL?\s+(\d{4})/);
    if (match) {
      const nombreMes = match[1]!.replace("Ñ", "N");
      if (MESES[nombreMes]) {
        mes = MESES[nombreMes]!;
        anio = Number(match[2]);
        break;
      }
    }
  }

  // --- Encabezado de columnas de "DETALLE DE GASTOS" (DESCRIPCION / FACTURA
  // O RECIBO / IMPORTE) — ancla las columnas de esa tabla; no se asume una
  // posición fija porque antes de esto viene la tabla de fondos, que tiene
  // otra forma. ---
  const indiceEncabezadoGastos = filas.findIndex((fila) => {
    const normalizada = fila.map((c) => norm(c));
    return normalizada.some((c) => c === "DESCRIPCION") && normalizada.some((c) => c.startsWith("FACTURA"));
  });

  let idxFacturaRecibo = 1;
  let idxImporte = 2;
  if (indiceEncabezadoGastos !== -1) {
    const headerRow = filas[indiceEncabezadoGastos]!.map((c) => norm(c));
    const buscar = (pred: (n: string) => boolean, fallback: number) => {
      const i = headerRow.findIndex(pred);
      return i === -1 ? fallback : i;
    };
    idxFacturaRecibo = buscar((n) => n.startsWith("FACTURA"), 1);
    idxImporte = buscar((n) => n === "IMPORTE", 2);
  }

  // --- Encabezado "Bs. DEBE / Bs. HABER" de "FONDOS RECIBIDOS" ---
  const indiceEncabezadoFondos = filas.findIndex((fila) => {
    const normalizada = fila.map((c) => norm(c));
    return normalizada.includes("DEBE") && normalizada.includes("HABER");
  });
  let idxDebe = -1;
  let idxHaber = -1;
  if (indiceEncabezadoFondos !== -1) {
    const headerRow = filas[indiceEncabezadoFondos]!.map((c) => norm(c));
    idxDebe = headerRow.findIndex((n) => n === "DEBE");
    idxHaber = headerRow.findIndex((n) => n === "HABER");
  }

  const fondos: FilaFondoExcel[] = [];
  const gastos: FilaGastoExcel[] = [];

  let seccion: "NINGUNA" | "FONDOS" | "GASTOS" = "NINGUNA";
  let categoriaActual: CategoriaRendicionGastoTexto | null = null;

  for (let i = 0; i < filas.length; i++) {
    const row = filas[i]!;
    const textoFila = row.map((c) => norm(c)).join(" ").trim();
    if (!textoFila) continue;
    const primeraCelda = primeraCeldaNoVacia(row);

    if (textoFila.includes("FONDOS RECIBIDOS")) {
      seccion = "FONDOS";
      continue;
    }
    if (textoFila.includes("DETALLE DE GASTOS")) {
      seccion = "GASTOS";
      categoriaActual = null;
      continue;
    }
    // Las filas de encabezado detectadas arriba son texto, no datos.
    if (i === indiceEncabezadoGastos || i === indiceEncabezadoFondos) continue;

    if (seccion === "FONDOS") {
      if (esTotalFinal(primeraCelda)) {
        seccion = "NINGUNA";
        continue;
      }
      const fecha = parseFechaDDMM(row[0]);
      // Sin fecha no hay forma de distinguir un dato real de un resto de
      // encabezado ("Bs." suelto en la fila de arriba de DEBE/HABER, por
      // ejemplo) — se descarta en silencio en vez de reportarlo como error.
      if (!fecha) continue;
      const referenciaCelda = row.find((c) => /^CH[-\s]*\d+/i.test(String(c ?? "").trim()));
      const referencia = referenciaCelda ? String(referenciaCelda).trim() : "";
      const monto =
        idxDebe !== -1
          ? (parseMonto(row[idxDebe]) ?? parseMonto(row[idxHaber]))
          : parseMonto([...row].reverse().find((c) => parseMonto(c) !== null));
      // Descripción = todo lo que no es la fecha, el código CH-xxx ni un
      // número — pragmático pero suficiente para lo que el reporte imprime.
      const descripcion = row
        .filter((c, idx) => idx !== 0 && c !== referenciaCelda && parseMonto(c) === null)
        .map((c) => String(c).trim())
        .filter(Boolean)
        .join(" ");
      fondos.push({ fila: i + 1, fecha, referencia, descripcion, monto });
      continue;
    }

    if (seccion === "GASTOS") {
      const categoriaDetectada = CATEGORIA_POR_TITULO[textoFila];
      if (categoriaDetectada) {
        categoriaActual = categoriaDetectada;
        continue;
      }
      if (esTotalFinal(primeraCelda)) {
        seccion = "NINGUNA";
        continue;
      }
      if (esSubTotal(primeraCelda)) continue;
      if (!categoriaActual) continue; // texto suelto antes de la primera categoría

      // La descripción real a veces viene partida en dos celdas (ej. "T DE 6"
      // SDR ALCANTARILLADO" en una columna y "(EDWIN CORO)" dos columnas más
      // allá, con una celda vacía en el medio) — se unen todas las celdas no
      // vacías desde el inicio de la fila hasta la columna de FACTURA O
      // RECIBO, en vez de confiar en una sola columna fija.
      const descripcion = row
        .slice(0, idxFacturaRecibo)
        .map((c) => String(c ?? "").trim())
        .filter(Boolean)
        .join(" ");
      const facturaORecibo = String(row[idxFacturaRecibo] ?? "").trim();
      const monto = parseMonto(row[idxImporte]);
      // Sin importe no hay nada que registrar — descarta en silencio texto
      // suelto (firmas, pie de página) que cayó dentro de la última
      // categoría sin que ningún patrón de corte lo haya detectado antes.
      if (monto === null) continue;

      gastos.push({ fila: i + 1, categoriaRendicion: categoriaActual, descripcion, facturaORecibo, monto });
    }
  }

  return { mes, anio, fondos, gastos };
}
