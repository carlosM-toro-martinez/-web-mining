export interface ParsedProductRow {
  groupCode: string;
  groupName: string;
  subGroupCode: string;
  subGroupName: string;
  productCode: string;
  productName: string;
  unidad: string;
  cantidad: number | undefined;
  precioUnit: number | undefined;
}

export interface CatalogoImportResult {
  gruposCreados: number;
  subGruposCreados: number;
  productosCreados: number;
  productosActualizados: number;
  stockActualizados: number;
  saldosMensualesCreados: number;
  saldosMensualesActualizados: number;
  warnings: string[];
}

export interface StockInicialItem {
  productoCodigo: string;
  cantidad: number;
  precioUnit: number;
}

export interface StockInicialResult {
  actualizados: number;
  noEncontrados: string[];
}

export interface SaldoMensualItem {
  productoCodigo: string;
  saldoInicial: number;
  ingresoQty: number;
  salidaQty: number;
  saldoFinal: number;
  precioUnit: number;
}

export interface SaldoMensualInput {
  anio: number;
  mes: number;
  items: SaldoMensualItem[];
}

export interface SaldoMensualResult {
  creados: number;
  actualizados: number;
  noEncontrados: string[];
}
