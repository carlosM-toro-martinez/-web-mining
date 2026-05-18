import XLSX from "xlsx";
import type { ParsedProductRow } from "./inventarioImport.types.js";

function toNumber(val: unknown): number | undefined {
  if (typeof val === "number") return isNaN(val) ? undefined : val;
  if (typeof val === "string") {
    const cleaned = val.replace(/,/g, "").trim();
    const n = parseFloat(cleaned);
    return isNaN(n) ? undefined : n;
  }
  return undefined;
}

function extractGroupName(raw: string): string {
  return raw
    .replace(/^GRUPO\s*:?\s*\d+\s*/i, "")
    .replace(/^[-.\s]+/, "")
    .trim();
}

function extractSubGroupName(raw: string): string {
  return raw
    .replace(/^sub-?grupo\s*:?\s*\d+\s*/i, "")
    .replace(/^[-.\s]+/, "")
    .trim();
}

const PRODUCT_CODE_RE = /^\d{2}-\d{2}-\d{4}$/;
const GROUP_CODE_RE = /^G-\d+$/i;

/**
 * Detecta en qué columna (índice 0-3) está el código de la fila.
 * Retorna -1 si la fila no es de grupo, sub-grupo ni producto.
 */
function detectCodeCol(row: unknown[]): number {
  for (let i = 0; i <= 3; i++) {
    const val = String(row[i] ?? "").trim();

    if (GROUP_CODE_RE.test(val) || PRODUCT_CODE_RE.test(val)) return i;

    // Sub-grupo: celda de código vacía, siguiente celda empieza con "Sub-Grupo"
    if (!val && /^sub.?grupo/i.test(String(row[i + 1] ?? "").trim())) return i;
  }
  return -1;
}

/**
 * Parsea el Excel de catálogo de inventario.
 *
 * Estructura esperada por fila (el offset de columna se detecta automáticamente):
 *   - Grupo:     [código G-XX]  [GRUPO : XX NOMBRE...]
 *   - Sub-grupo: [vacío]        [Sub-Grupo : XX Nombre...]
 *   - Producto:  [XX-XX-XXXX]   [nombre]  [unidad]  [cantidad?]  [precioUnit?]
 */
export function parseCatalogoExcel(buffer: Buffer): ParsedProductRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("El archivo Excel está vacío");

  const sheet = wb.Sheets[sheetName]!;
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  const result: ParsedProductRow[] = [];
  let currentGroup    = { code: "", name: "" };
  let currentSubGroup = { code: "", name: "" };

  for (const rawRow of rows) {
    const row = rawRow as unknown[];

    const codeIdx = detectCodeCol(row);
    if (codeIdx === -1) continue;

    const colCode  = String(row[codeIdx]     ?? "").trim();
    const colName  = String(row[codeIdx + 1] ?? "").trim();
    const colUnit  = String(row[codeIdx + 2] ?? "").trim();
    const colQty   = row[codeIdx + 3];
    const colPrice = row[codeIdx + 4];

    // Grupo
    if (GROUP_CODE_RE.test(colCode)) {
      const code = colCode.replace(/^G-/i, "").padStart(2, "0");
      currentGroup    = { code, name: extractGroupName(colName) };
      currentSubGroup = { code: "", name: "" };
      continue;
    }

    // Sub-grupo
    if (!colCode && /^sub.?grupo/i.test(colName)) {
      currentSubGroup = { code: "", name: extractSubGroupName(colName) };
      continue;
    }

    // Producto
    if (PRODUCT_CODE_RE.test(colCode)) {
      const parts       = colCode.split("-");
      const subGroupCode = `${parts[0]}-${parts[1]}`;

      if (!currentSubGroup.code) {
        currentSubGroup = { ...currentSubGroup, code: subGroupCode };
      }

      result.push({
        groupCode:    parts[0]!,
        groupName:    currentGroup.name,
        subGroupCode,
        subGroupName: currentSubGroup.name,
        productCode:  colCode,
        productName:  colName,
        unidad:       colUnit || "Pza",
        cantidad:     toNumber(colQty),
        precioUnit:   toNumber(colPrice),
      });
    }
  }

  return result;
}
