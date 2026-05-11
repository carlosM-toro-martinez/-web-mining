import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

const LABORATORIES = {
  CHILLCOBIJA: "87bcd6ab-6822-487f-a32c-64a845332789",
  POTOSI: "7be4ef86-9d41-476b-8bca-b8866a09b804",
  SPECTROLAB: "bd710ec8-9333-4d50-b0f4-afbfa0fc7bcd",
};

const ELEMENTS = {
  AG: "291012ee-354a-4144-a94d-38c31c90d8d0",
  CU: "45a37956-f9c1-44f1-b132-d783f2ae2934",
  AU: "8b60c339-356f-4de4-9e5b-effdd7638ff1",
};

function normalize(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeKey(value) {
  return normalize(value)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function findColumn(row, names) {
  const keys = Object.keys(row);

  for (const name of names) {
    const target = normalizeKey(name);
    const found = keys.find((key) => normalizeKey(key) === target);
    if (found) return found;
  }

  return null;
}

function cleanNumber(value) {
  if (value === null || value === undefined || value === "") return "";

  const text = String(value).replace(",", ".").trim();
  const number = Number(text);

  return Number.isFinite(number) ? number : "";
}

function normalizeLab(value) {
  const text = normalizeKey(value);

  if (!text) return "";

  if (text.includes("CHILL") || text.includes("CHILCOBIJA")) {
    return LABORATORIES.CHILLCOBIJA;
  }

  if (text.includes("POTOSI")) {
    return LABORATORIES.POTOSI;
  }

  if (text.includes("SPECTRO")) {
    return LABORATORIES.SPECTROLAB;
  }

  return "";
}

function normalizeSampleType(value) {
  const text = normalizeKey(value);

  if (text.includes("SIMPLE") && text.includes("DOBLE")) return "SIMPLE_DOUBLE";
  if (text === "SIMPLE") return "SIMPLE";
  if (text === "DOBLE" || text === "DOUBLE") return "DOUBLE";

  return "OTHER";
}

function formatDate(value) {
  if (!value) return "";

  if (value instanceof Date) {
    // xlsx cellDates:true produces UTC midnight — use UTC accessors to avoid day shift
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}T00:00:00.000Z`;
  }

  const text = normalize(value);
  if (!text) return "";

  // DD/MM/YYYY or DD-MM-YYYY (formato boliviano)
  const ddmmyyyy = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00.000Z`;
  }

  // YYYY-MM-DD
  const yyyymmdd = text.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (yyyymmdd) {
    const [, y, m, d] = yyyymmdd;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00.000Z`;
  }

  return text;
}

function findResultColumn(headers, element, slot) {
  const elementUpper = element.toUpperCase();
  const slotText = `(${slot})`;

  return headers.find((header) => {
    const text = normalizeKey(header);
    return text.startsWith(elementUpper) && text.includes(slotText);
  });
}

function findAuColumns(headers) {
  return headers.filter((header) => {
    const text = normalizeKey(header);
    return text.startsWith("AU");
  });
}

function toCsv(rows, headers) {
  const escape = (value) => {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes('"') || text.includes("\n")) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}

async function main() {
  const rl = readline.createInterface({ input, output });

  const excelPath = await rl.question("Ruta del Excel: ");
  const miningLaborId = await rl.question("miningLaborId para este archivo: ");

  rl.close();

  if (!excelPath || !fs.existsSync(excelPath)) {
    throw new Error("La ruta del Excel no existe.");
  }

  if (!miningLaborId) {
    throw new Error("Debes ingresar miningLaborId.");
  }

  const workbook = XLSX.readFile(excelPath, {
    cellDates: true,
    raw: false,
  });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Read raw to find the actual header row (the sheet may have title rows on top)
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  const headerRowIdx = rawRows.findIndex((row) =>
    row.some((cell) => normalizeKey(String(cell)).includes("CODIGO")),
  );

  if (headerRowIdx === -1) {
    throw new Error(
      'No se encontró la fila de encabezados (busco "CODIGO") en el Excel.',
    );
  }

  if (headerRowIdx > 0) {
    console.log(`Encabezados encontrados en la fila ${headerRowIdx + 1} (se omitieron ${headerRowIdx} filas de título).`);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    range: headerRowIdx,
  });

  if (!rows.length) {
    throw new Error("El Excel no tiene datos después de los encabezados.");
  }

  const headers = Object.keys(rows[0]);

  const colNumber = findColumn(rows[0], ["N°", "Nº", "N", "NUMERO"]);
  const colDate = findColumn(rows[0], ["FECHA MUESTREO", "FECHA"]);
  const colName = findColumn(rows[0], ["NOMBRE"]);
  const colType = findColumn(rows[0], ["TIPO DE MUESTRA", "TIPO"]);
  const colCode = findColumn(rows[0], ["CODIGO", "CÓDIGO"]);
  const colReference = findColumn(rows[0], ["REFERENCIA DEL LUGAR", "REFERENCIA"]);
  const colEast = findColumn(rows[0], ["ESTE"]);
  const colNorth = findColumn(rows[0], ["NORTE"]);
  const colElevation = findColumn(rows[0], ["ELEVACION", "ELEVACIÓN"]);
  const colDescription = findColumn(rows[0], ["DESCRIPCION", "DESCRIPCIÓN"]);

  const colLab1 = findColumn(rows[0], ["LAB 1", "LAB1"]);
  const colLab2 = findColumn(rows[0], ["LAB 2", "LAB2"]);
  const colLab3 = findColumn(rows[0], ["LAB 3", "LAB3"]);

  const outputHeaders = [
    "miningLaborId",
    "code",
    "number",
    "sampledAt",
    "name",
    "sampleType",
    "placeReference",
    "east",
    "north",
    "elevation",
    "description",
    "observations",
    "lab_1_id",
    "lab_2_id",
    "lab_3_id",

    `RESULT_${ELEMENTS.AG}_L1`,
    `RESULT2_${ELEMENTS.AG}_L1`,
    `RESULT3_${ELEMENTS.AG}_L1`,

    `RESULT_${ELEMENTS.CU}_L2`,
    `RESULT2_${ELEMENTS.CU}_L2`,
    `RESULT3_${ELEMENTS.CU}_L2`,

    `RESULT_${ELEMENTS.AU}_L3`,
    `RESULT2_${ELEMENTS.AU}_L3`,
    `RESULT3_${ELEMENTS.AU}_L3`,
  ];

  const converted = rows
    .map((row) => {
      const code = normalize(row[colCode]);

      if (!code) return null;

      const agL1 = findResultColumn(headers, "Ag", "L1");
      const agL2 = findResultColumn(headers, "Ag", "L2");
      const agL3 = findResultColumn(headers, "Ag", "L3");

      const cuL1 = findResultColumn(headers, "Cu", "L1");
      const cuL2 = findResultColumn(headers, "Cu", "L2");
      const cuL3 = findResultColumn(headers, "Cu", "L3");

      const auColumns = findAuColumns(headers);

      return {
        miningLaborId,
        code,
        number: cleanNumber(row[colNumber]),
        sampledAt: formatDate(row[colDate]),
        name: normalize(row[colName]),
        sampleType: normalizeSampleType(row[colType]),
        placeReference: normalize(row[colReference]),
        east: cleanNumber(row[colEast]),
        north: cleanNumber(row[colNorth]),
        elevation: cleanNumber(row[colElevation]),
        description: normalize(row[colDescription]),
        observations: "",

        lab_1_id: normalizeLab(row[colLab1]),
        lab_2_id: normalizeLab(row[colLab2]),
        lab_3_id: normalizeLab(row[colLab3]),

        [`RESULT_${ELEMENTS.AG}_L1`]: cleanNumber(row[agL1]),
        [`RESULT2_${ELEMENTS.AG}_L1`]: cleanNumber(row[agL2]),
        [`RESULT3_${ELEMENTS.AG}_L1`]: cleanNumber(row[agL3]),

        [`RESULT_${ELEMENTS.CU}_L2`]: cleanNumber(row[cuL1]),
        [`RESULT2_${ELEMENTS.CU}_L2`]: cleanNumber(row[cuL2]),
        [`RESULT3_${ELEMENTS.CU}_L2`]: cleanNumber(row[cuL3]),

        [`RESULT_${ELEMENTS.AU}_L3`]: cleanNumber(row[auColumns[0]]),
        [`RESULT2_${ELEMENTS.AU}_L3`]: cleanNumber(row[auColumns[1]]),
        [`RESULT3_${ELEMENTS.AU}_L3`]: cleanNumber(row[auColumns[2]]),
      };
    })
    .filter(Boolean);

  const parsedPath = path.parse(excelPath);
  const outputCsv = path.join(parsedPath.dir, `${parsedPath.name}_convertido.csv`);
  const outputXlsx = path.join(parsedPath.dir, `${parsedPath.name}_convertido.xlsx`);

  fs.writeFileSync(outputCsv, toCsv(converted, outputHeaders), "utf8");

  const outputWorkbook = XLSX.utils.book_new();
  const outputSheet = XLSX.utils.json_to_sheet(converted, {
    header: outputHeaders,
  });

  XLSX.utils.book_append_sheet(outputWorkbook, outputSheet, "Converted");
  XLSX.writeFile(outputWorkbook, outputXlsx);

  console.log("Conversión terminada.");
  console.log(`CSV: ${outputCsv}`);
  console.log(`Excel: ${outputXlsx}`);
  console.log(`Registros convertidos: ${converted.length}`);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
