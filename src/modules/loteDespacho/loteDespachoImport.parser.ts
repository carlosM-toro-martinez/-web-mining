import XLSX from "xlsx";

// Parser del "Cuadro de envío de Carga Chami" (Mina Lipeña -> Chilcobija)
// que la empresa arma en Excel mes a mes. El archivo real tiene varias filas
// de título fusionadas ANTES del encabezado real de columnas ("Empresa
// Minera", "MARTE S.R.L", "CUADRO DE ENVIO...", "Mes: ..."), así que no se
// puede asumir que la fila 1 sea el encabezado — se busca la fila que
// contiene literalmente "FECHA" y "CONOCIMIENTO".
//
// No lee ni el tipo de mineral ni el ingenio destino: esta planilla es
// SIEMPRE "Carga Chami" de "Mina Lipeña a Chilcobija" (está en el título del
// documento, no en una columna), así que el servicio los asume fijos.

export interface FilaCuadroEnvio {
  fila: number; // número de fila real en el Excel, para mensajes de error
  fecha: Date | null;
  correlativoNumero: number | null;
  correlativoMes: string | null; // "09", "10"... tal cual el Excel
  form101: string;
  pesoKg: number | null; // ya convertido a TONELADAS, pese al nombre del campo
  municipioCodigo: string;
  municipioNombre: string;
  nivel: string;
  propietario: string;
  chofer: string;
  placa: string;
  combustibleLitros: number | null;
}

// Pasa SOLO cuando "FECHA" vino como texto plano, no como celda de fecha
// real de Excel — esas se confían directo por el serial (ver parseFecha).
// Prioriza MM/DD/AAAA (la convención confirmada contra el documento real:
// "09/01/2026" con año de 4 dígitos = 1 de septiembre de 2026), y SOLO cae
// a DD/MM/AAAA cuando el mes en esa posición es imposible (>12) — esto
// cubre, sin ambigüedad real, las filas que vienen escritas al revés (ej.
// "14/9/2026": el 14 no puede ser mes, así que es el día → 14 de septiembre).
function parseTextoFecha(texto: string): Date | null {
  const match = texto.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;
  const [, aStr, bStr, yStr] = match;
  const a = Number(aStr);
  const b = Number(bStr);
  let anio = Number(yStr);
  if (anio < 100) anio += 2000;

  if (a >= 1 && a <= 12 && b >= 1 && b <= 31) return new Date(Date.UTC(anio, a - 1, b));
  if (b >= 1 && b <= 12 && a >= 1 && a <= 31) return new Date(Date.UTC(anio, b - 1, a));
  return null;
}

// Las celdas de fecha REALES de Excel (no texto) se leen por su valor
// serial con cellDates:true — ese número es inequívoco (no depende de
// ningún formato ni locale), así que acá no hace falta adivinar nada. Si
// el dato de origen está mal (alguien tipeó la fecha equivocada), seguirá
// mal — pero eso ya no es algo que un parser pueda "arreglar" adivinando.
function parseFecha(raw: unknown): Date | null {
  if (raw instanceof Date) return new Date(Date.UTC(raw.getFullYear(), raw.getMonth(), raw.getDate()));
  if (typeof raw === "string") return parseTextoFecha(raw);
  return null;
}

function norm(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

// Convierte "26.399" (formato boliviano: "." separador de miles) a 26399.
// Si no calza con ese patrón, intenta un parseFloat normal. Se usa para
// columnas donde el valor YA está en la unidad final (ej. COMBUSTIBLE en
// litros) — para "Peso Kg" se usa parsePesoToneladas en su lugar, porque
// ahí el "." puede significar dos cosas distintas según el tipo de celda.
function parseNumeroExcel(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "number") return isNaN(raw) ? null : raw;
  const s = String(raw).trim();
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    return parseFloat(s.replace(/\./g, "").replace(",", "."));
  }
  const n = parseFloat(s.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

// "Peso Kg" es ambiguo según cómo haya quedado guardada la celda en Excel:
// - Si la celda es un NÚMERO real (ej. 19.709 tal cual), ESE valor ya está
//   en toneladas — un "." en un número de JS siempre es punto decimal,
//   nunca separador de miles, así que no hay nada que convertir.
// - Si la celda es TEXTO con el patrón boliviano de punto de miles cada 3
//   dígitos (ej. "26.989"), representa kilos (26.989 = 26 989 kg) y hay
//   que dividir entre 1000 para obtener toneladas.
// Antes esto se resolvía con parseNumeroExcel() + una división entre 1000
// SIEMPRE en el servicio — funcionaba para el caso de texto, pero aplastaba
// a casi cero cualquier celda que Excel ya guardó como número (19.709
// toneladas terminaba guardado como 0.019709).
function parsePesoToneladas(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "number") return isNaN(raw) ? null : raw;
  const s = String(raw).trim();
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    const kg = parseFloat(s.replace(/\./g, "").replace(",", "."));
    return isNaN(kg) ? null : kg / 1000;
  }
  const n = parseFloat(s.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

function buscarColumna(headerRow: unknown[], usadas: Set<number>, predicate: (norm: string) => boolean): number {
  for (let i = 0; i < headerRow.length; i++) {
    if (usadas.has(i)) continue;
    if (predicate(norm(headerRow[i]))) {
      usadas.add(i);
      return i;
    }
  }
  return -1;
}

export function parseCuadroEnvioExcel(buffer: Buffer): FilaCuadroEnvio[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]!];
  if (!sheet) throw new Error("El archivo Excel está vacío o no tiene hojas.");

  const filas = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  const indiceEncabezado = filas.findIndex(
    (fila) => fila.some((c) => norm(c) === "FECHA") && fila.some((c) => norm(c) === "CONOCIMIENTO"),
  );
  if (indiceEncabezado === -1) {
    throw new Error(
      'No se encontró la fila de encabezados (se esperaba una fila con "FECHA" y "CONOCIMIENTO"). Verifica que sea el Cuadro de Envío original.',
    );
  }

  const headerRow = filas[indiceEncabezado]!;
  const usadas = new Set<number>();
  const idx = {
    fecha: buscarColumna(headerRow, usadas, (n) => n === "FECHA"),
    conocimiento: buscarColumna(headerRow, usadas, (n) => n === "CONOCIMIENTO"),
    form101: buscarColumna(headerRow, usadas, (n) => n.startsWith("FORM")),
    pesoKg: buscarColumna(headerRow, usadas, (n) => n.startsWith("PESO")),
    municipioNombre: buscarColumna(headerRow, usadas, (n) => n === "MUNICIPIO"),
    municipioCodigo: buscarColumna(headerRow, usadas, (n) => n.startsWith("MUNICIPIO")),
    nivel40: buscarColumna(headerRow, usadas, (n) => n === "NIVEL 40"),
    nivel0: buscarColumna(headerRow, usadas, (n) => n === "NIVEL 0"),
    nivel80: buscarColumna(headerRow, usadas, (n) => n === "NIVEL 80"),
    laMoza: buscarColumna(headerRow, usadas, (n) => n === "LA MOZA"),
    propietario: buscarColumna(headerRow, usadas, (n) => n === "PROPIETARIO"),
    chofer: buscarColumna(headerRow, usadas, (n) => n === "CHOFER"),
    placa: buscarColumna(headerRow, usadas, (n) => n === "PLACA"),
    combustible: buscarColumna(headerRow, usadas, (n) => n.startsWith("COMBUSTIBLE")),
  };

  const faltantes = (["fecha", "conocimiento", "propietario", "chofer", "placa"] as const).filter(
    (clave) => idx[clave] === -1,
  );
  if (faltantes.length > 0) {
    throw new Error(`No se pudieron ubicar estas columnas obligatorias: ${faltantes.join(", ")}.`);
  }

  const resultado: FilaCuadroEnvio[] = [];

  for (let i = indiceEncabezado + 1; i < filas.length; i++) {
    const row = filas[i]!;
    const placa = String(row[idx.placa] ?? "").trim();
    const chofer = String(row[idx.chofer] ?? "").trim();
    const conocimiento = String(row[idx.conocimiento] ?? "").trim();
    // Fila completamente vacía (suele haber una al final de la tabla): se ignora sin reportar error.
    if (!placa && !chofer && !conocimiento) continue;

    const [numeroTexto, mesTexto] = conocimiento.split("/").map((s) => s.trim());
    let nivel = "";
    for (const [colIdx, etiqueta] of [
      [idx.nivel40, "Nivel 40"],
      [idx.nivel0, "Nivel 0"],
      [idx.nivel80, "Nivel 80"],
      [idx.laMoza, "La Moza"],
    ] as const) {
      if (colIdx < 0) continue;
      if (String(row[colIdx] ?? "").trim() !== "") {
        nivel = etiqueta;
        break;
      }
    }

    resultado.push({
      fila: i + 1,
      fecha: parseFecha(row[idx.fecha]),
      correlativoNumero: numeroTexto ? Number(numeroTexto) : null,
      correlativoMes: mesTexto || null,
      form101: idx.form101 >= 0 ? String(row[idx.form101] ?? "").trim() : "",
      pesoKg: idx.pesoKg >= 0 ? parsePesoToneladas(row[idx.pesoKg]) : null,
      municipioCodigo: idx.municipioCodigo >= 0 ? String(row[idx.municipioCodigo] ?? "").trim() : "",
      municipioNombre: idx.municipioNombre >= 0 ? String(row[idx.municipioNombre] ?? "").trim() : "",
      nivel,
      propietario: String(row[idx.propietario] ?? "").trim(),
      chofer,
      placa,
      combustibleLitros: idx.combustible >= 0 ? parseNumeroExcel(row[idx.combustible]) : null,
    });
  }

  return resultado;
}
