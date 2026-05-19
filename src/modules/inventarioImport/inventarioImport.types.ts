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
  saldosMensualesCreados: number;
  saldosMensualesActualizados: number;
  warnings: string[];
}

// ─── Stock inicial ─────────────────────────────────────────────────────────────

export interface StockInicialItem {
  productoCodigo: string;
  cantidad: number;
  precioUnit: number;
}

export interface StockInicialResult {
  actualizados: number;
  noEncontrados: string[];
}

// ─── Saldo mensual – carga batch ──────────────────────────────────────────────

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

// ─── Saldo mensual – item individual ─────────────────────────────────────────

export interface SaldoMensualItemInput {
  productoId?: number | undefined;
  productoCodigo?: string | undefined;
  anio: number;
  mes: number;
  saldoInicial: number;
  ingresoQty: number;
  salidaQty: number;
  saldoFinal: number;
  precioUnit: number;
}

export interface SaldoMensualItemResult {
  id: string;
  productoId: number;
  productoCodigo: string;
  productoNombre: string;
  anio: number;
  mes: number;
  saldoInicial: number;
  ingresoQty: number;
  salidaQty: number;
  saldoFinal: number;
  precioUnit: number;
  totalBs: number;
  accion: "creado" | "actualizado";
}

export interface UpdateSaldoMensualItemInput {
  saldoInicial?: number | undefined;
  ingresoQty?: number | undefined;
  salidaQty?: number | undefined;
  saldoFinal?: number | undefined;
  precioUnit?: number | undefined;
}

// ─── Autocomplete de productos ───────────────────────────────────────────────

export interface ProductoAutocompleteItem {
  id: number;
  codigo: string;
  nombre: string;
  unidad: string;
  grupo: string;
  subGrupo: string | null;
  stockActual: number;
  precioUnit: number;
}

// ─── Stock inicial – item individual con creación opcional ────────────────────

export interface NuevoProductoData {
  codigo: string;
  nombre: string;
  unidad: string;
  grupoId: number;
  subgrupoId: number;
  centroCostoId: number;
  funcionGastoId: number;
  esEpp?: boolean | undefined;
}

export interface StockInicialItemInput {
  productoId?: number | undefined;
  crearProducto?: NuevoProductoData | undefined;
  cantidad: number;
  precioUnit: number;
}

export interface StockInicialItemResult {
  productoId: number;
  productoCodigo: string;
  productoNombre: string;
  cantidad: number;
  precioUnit: number;
  stockAccion: "creado" | "actualizado";
  productoCreado: boolean;
}

// ─── Reiniciar stock ──────────────────────────────────────────────────────────

export interface ReiniciarStockResult {
  eliminados: number;
}

// ─── Sincronizar stock desde SaldoMensual ─────────────────────────────────────

export interface SincronizarStockResult {
  actualizados: number;
  creados: number;
  sinSaldo: number;
}
