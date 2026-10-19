export type { BinCardQueryDTO, StockQueryDTO, ValesResumenQueryDTO, ComprasResumenQueryDTO } from "./reportes.schema.js";

export interface BinCardItem {
  id: string;
  operationId: string;
  fecha: Date;
  tipo: "ENTRADA" | "SALIDA";
  cantidad: number;
  stockAntes: number;
  stockDespues: number;
  usuarioNombre: string;
  solicitanteNombre: string | null;
  referencia: string | null;
  referenciaId: string | null;
  productoNombre: string;
  productoId: number;
  productoCodigo: string;
  esRetroactivo?: boolean;
  periodoAnio?: number;
  periodoMes?: number;
}

export interface BinCardValoradoItem extends BinCardItem {
  precioUnit: number;
  entradaBs: number;
  salidaBs: number;
  saldoBs: number;
}

export interface StockItem {
  productoId: number;
  codigo: string;
  nombre: string;
  unidad: string;
  categoria: string;
  cantidad: number;
  cantidadReservada: number;
  cantidadDisponible: number;
  precioUnit: number;
  precioProm: number;
  valorTotal: number;
}
