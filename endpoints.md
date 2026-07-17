Reportes de Compras
GET /api/reportes/compras

{
"compras": [
{
"id": 12,
"estado": "RECIBIDA",
"numeroFactura": "F-001-0000452",
"fechaOperacion": "2025-10-15T00:00:00.000Z",
"proveedor": { "id": 3, "nombre": "Distribuidora XYZ" },
"items": [
{ "productoId": 5, "codigo": "MAT-005", "nombre": "Cemento Portland", "cantidad": 50, "precioUnit": "85.00" }
],
"totalBs": "4250.00"
}
],
"meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
GET /api/reportes/compras-detalle

{
"compras": [
{
"id": 12,
"estado": "RECIBIDA",
"numeroFactura": "F-001-0000452",
"fechaOperacion": "2025-10-15T00:00:00.000Z",
"proveedor": { "id": 3, "nombre": "Distribuidora XYZ" },
"items": [
{
"productoId": 5,
"codigo": "MAT-005",
"nombre": "Cemento Portland",
"cantidad": 50,
"precioUnit": "85.00",
"subtotalBs": "4250.00",
"descuentoBs": "0.00",
"totalBs": "4250.00"
}
],
"subtotalBs": "4250.00",
"descuentoBs": "0.00",
"totalBs": "4250.00"
}
],
"totalGeneral": "4250.00",
"meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
GET /api/reportes/compras-proveedor

{
"proveedores": [
{
"id": 3,
"nombre": "Distribuidora XYZ",
"compras": [
{
"id": 12,
"numeroFactura": "F-001-0000452",
"fechaOperacion": "2025-10-15T00:00:00.000Z",
"items": [
{
"productoId": 5,
"codigo": "MAT-005",
"nombre": "Cemento Portland",
"cantidad": 50,
"precioUnit": "85.00",
"totalBs": "4250.00",
"totalSinIVA": "3697.50"
}
],
"totalBs": "4250.00",
"totalSinIVA": "3697.50"
}
],
"totalBs": "4250.00",
"totalSinIVA": "3697.50"
}
],
"totalGeneral": "4250.00",
"totalGeneralSinIVA": "3697.50"
}
GET /api/reportes/anulaciones-entradas

{
"meses": [
{
"anio": 2025,
"mes": 10,
"compras": [
{
"id": 12,
"numeroFactura": "F-001-0000452",
"proveedor": { "nombre": "Distribuidora XYZ" },
"anulacion": {
"motivo": "Factura duplicada",
"fecha": "2025-10-20T10:30:00.000Z",
"usuario": "admin"
},
"items": [
{ "productoId": 5, "nombre": "Cemento Portland", "cantidad": 50, "precioUnit": "85.00", "totalBs": "4250.00" }
],
"totalBs": "4250.00"
}
],
"totalGeneral": "4250.00"
}
]
}
GET /api/reportes/entradas-almacen

{
"meses": [
{
"anio": 2025,
"mes": 10,
"grupos": [
{
"codigo": "01",
"nombre": "Materiales de Construcción",
"totalBsEntrada": "4250.00",
"totalBsEntradaMenos13": "3697.50",
"subGrupos": [
{
"codigo": "01-01",
"nombre": "Cementos y Agregados",
"totalBsEntrada": "4250.00",
"totalBsEntradaMenos13": "3697.50",
"productos": [
{
"productoId": 5,
"codigo": "MAT-005",
"nombre": "Cemento Portland",
"cantidad": 50,
"precioUnit": "85.00",
"totalBsEntrada": "4250.00",
"totalBsEntradaMenos13": "3697.50"
}
]
}
]
}
],
"totalGeneral": "4250.00",
"totalGeneralMenos13": "3697.50"
}
]
}
GET /api/reportes/cuadro-suministros

{
"meses": [
{
"anio": 2025,
"mes": 10,
"suministros": [
{
"productoId": 5,
"codigo": "MAT-005",
"nombre": "Cemento Portland",
"cantidadPedida": 60,
"cantidadRecibida": 50,
"cantidadPendiente": 10,
"totalBsRecibido": "4250.00"
}
],
"totalGeneral": "4250.00"
}
]
}
GET /api/reportes/compras-con-saldo-inicial

{
"meses": [
{
"anio": 2025,
"mes": 10,
"productos": [
{
"productoId": 5,
"codigo": "MAT-005",
"nombre": "Cemento Portland",
"saldoInicial": 20,
"saldoInicialBs": "1400.00",
"cantidadComprada": 50,
"totalComprasBs": "4250.00",
"totalDisponible": 70,
"totalDisponibleBs": "5650.00"
}
],
"totalGeneral": "5650.00"
}
]
}
Reportes de Inventario Inicial
GET /api/reportes/saldos-iniciales

{
"meses": [
{
"anio": 2025,
"mes": 10,
"grupos": [
{
"codigo": "01",
"nombre": "Materiales de Construcción",
"totalGeneral": "1400.00",
"productos": [
{
"productoId": 5,
"codigo": "MAT-005",
"nombre": "Cemento Portland",
"saldoInicial": 20,
"precioUnit": "70.00",
"totalBsInicial": "1400.00",
"fuente": "corregido"
},
{
"productoId": 7,
"codigo": "MAT-007",
"nombre": "Arena Gruesa",
"saldoInicial": 10,
"precioUnit": "30.00",
"totalBsInicial": "300.00",
"fuente": "calculado"
}
]
}
],
"totalGeneral": "1700.00",
"meta": { "corregidos": 1, "calculados": 1 }
}
]
}
fuente: "corregido" → totalBsInicial fue seteado manualmente (el backfill NO lo toca).
fuente: "calculado" → totalBsInicial es null en DB, se calcula como saldoInicial × precioUnitProm. El backfill SÍ puede afectar este valor si cambia precioUnitProm.

GET /api/reportes/stock

{
"items": [
{
"productoId": 5,
"codigo": "MAT-005",
"nombre": "Cemento Portland",
"cantidad": 35,
"cantidadReservada": 5,
"cantidadDisponible": 30,
"precioUnit": "73.95",
"precioProm": "73.95",
"valorTotal": "2588.25"
}
],
"meta": { "page": 1, "limit": 50, "total": 1, "totalPages": 1 }
}
Reportes de Salidas
GET /api/reportes/vales

{
"vales": [
{
"id": "25a94918-79de-47e7-941c-d3535e1d5934",
"estado": "COMPLETADO",
"fechaOperacion": "2025-10-02T00:00:00.000Z",
"solicitante": { "id": 4, "nombre": "Juan Pérez", "cargo": "Operador" },
"almacenero": { "id": 2, "nombre": "María López" },
"centroCosto": { "codigo": "CC-01", "nombre": "Producción" },
"items": [
{ "productoId": 5, "codigo": "MAT-005", "nombre": "Cemento Portland", "cantidadSolicitada": 1, "cantidadEntregada": 1 }
]
}
],
"meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
GET /api/reportes/salidas-almacen

{
"meses": [
{
"anio": 2025,
"mes": 10,
"grupos": [
{
"codigo": "01",
"nombre": "Materiales de Construcción",
"totalBsSalida": "73.95",
"subGrupos": [
{
"codigo": "01-01",
"nombre": "Cementos y Agregados",
"totalBsSalida": "73.95",
"productos": [
{
"productoId": 5,
"codigo": "MAT-005",
"nombre": "Cemento Portland",
"salidaQty": 1,
"precioUnit": "73.95",
"totalBsSalida": "73.95"
}
]
}
]
}
],
"totalGeneral": "73.95"
}
]
}
precioUnit aquí viene de precioUnitProm → precioUnit → menos13(compraAvg) en ese orden de prioridad.

GET /api/reportes/salidas-detalle

{
"meses": [
{
"anio": 2025,
"mes": 10,
"salidas": [
{
"movimientoId": 88,
"fecha": "2026-07-16T14:22:00.000Z",
"valeId": "25a94918-79de-47e7-941c-d3535e1d5934",
"solicitante": "Juan Pérez",
"centroCosto": "CC-01",
"productoId": 5,
"codigo": "MAT-005",
"nombre": "Cemento Portland",
"cantidad": 1,
"precioUnit": "73.95",
"totalBs": "73.95"
}
],
"totalGeneral": "73.95"
}
]
}
GET /api/reportes/detalle-materiales

{
"meses": [
{
"anio": 2025,
"mes": 10,
"lineas": [
{
"subCuenta": "5101",
"subCentro": "PROD-01",
"importeBs": "73.95"
}
],
"subtotalesPorSubCentro": [
{ "subCentro": "PROD-01", "totalBs": "73.95" }
],
"porCuenta": [
{
"codigoCompleto": "5101-PROD-01",
"esTransporte": false,
"totalBs": "73.95",
"lineas": [
{ "productoId": 5, "nombre": "Cemento Portland", "cantidad": 1, "precioUnit": "73.95", "totalBs": "73.95" }
]
}
],
"totalGeneral": "73.95"
}
]
}
GET /api/reportes/anulaciones-salidas

{
"meses": [
{
"anio": 2025,
"mes": 10,
"vales": [
{
"valeId": "abc123",
"anulacion": {
"motivo": "Error en producto solicitado",
"fecha": "2025-10-10T09:00:00.000Z",
"usuario": "admin"
},
"items": [
{ "productoId": 5, "codigo": "MAT-005", "nombre": "Cemento Portland", "cantidad": 2 }
]
}
],
"total": 1
}
]
}
Los vales anulados NO tienen totalBs porque los vales no almacenan precio por ítem. Además, los valesAnuladosIds se excluyen de todos los cálculos de salidas en los otros reportes.

Reportes donde influyen los 3 (compras + inventario inicial + salidas)
GET /api/reportes/balance-mensual

{
"meses": [
{
"anio": 2025,
"mes": 10,
"grupos": [
{
"grupoCodigo": "01",
"grupoNombre": "Materiales de Construcción",
"saldoInicial": "1400.00",
"ingresoMateriales": "3697.50",
"salidaMateriales": "73.95",
"saldoFinal": "5023.55"
}
],
"totales": {
"saldoInicial": "1400.00",
"ingresoMateriales": "3697.50",
"salidaMateriales": "73.95",
"saldoFinal": "5023.55"
}
}
]
}
saldoInicial usa totalBsInicial si existe (fuente="corregido"), sino saldoInicial × precioUnitProm (fuente="calculado").
ingresoMateriales = suma de sinIvaIngresoRaw (sin redondeo por ítem, acumulado raw).
salidaMateriales = cantidad × precioFinalMap[productoId].

GET /api/reportes/inventario-almacen

{
"meses": [
{
"anio": 2025,
"mes": 10,
"grupos": [
{
"codigo": "01",
"nombre": "Materiales de Construcción",
"saldoInicial": "1400.00",
"ingresoQty": 50,
"salidaQty": 1,
"saldoFinal": "5023.55",
"subGrupos": [
{
"codigo": "01-01",
"nombre": "Cementos y Agregados",
"saldoInicial": "1400.00",
"ingresoQty": 50,
"salidaQty": 1,
"saldoFinal": "5023.55",
"productos": [
{
"productoId": 5,
"codigo": "MAT-005",
"nombre": "Cemento Portland",
"saldoInicial": 20,
"saldoInicialBs": "1400.00",
"ingresoQty": 50,
"salidaQty": 1,
"saldoFinalQty": 69,
"precioUnit": "73.95",
"totalBs": "5102.55"
}
]
}
]
}
]
}
]
}
GET /api/reportes/diario-almacenes

{
"meses": [
{
"anio": 2025,
"mes": 10,
"asientos": [
{
"fecha": "2025-10-15",
"descripcion": "Compra F-001-0000452 - Distribuidora XYZ",
"debe": "3697.50",
"haber": "0.00",
"cuenta": "Inventario Almacén"
},
{
"fecha": "2025-10-02",
"descripcion": "Vale 25a94918 - Juan Pérez",
"debe": "0.00",
"haber": "73.95",
"cuenta": "Inventario Almacén"
}
],
"totalDebe": "3697.50",
"totalHaber": "73.95",
"saldoNeto": "3623.55"
}
]
}
DEBE = ingreso ex-IVA (× 0.87). HABER = salidas a CPP (precioUnitProm).

GET /api/reportes/bin-card

{
"items": [
{
"id": 85,
"fecha": "2025-10-01T00:00:00.000Z",
"tipo": "SALDO_INICIAL",
"cantidad": 20,
"stockAntes": 0,
"stockDespues": 20,
"productoNombre": "Cemento Portland",
"referencia": null
},
{
"id": 86,
"fecha": "2025-10-15T00:00:00.000Z",
"tipo": "ENTRADA",
"cantidad": 50,
"stockAntes": 20,
"stockDespues": 70,
"productoNombre": "Cemento Portland",
"referencia": "COMPRA"
},
{
"id": 88,
"fecha": "2026-07-16T14:22:00.000Z",
"tipo": "SALIDA",
"cantidad": 1,
"stockAntes": 70,
"stockDespues": 69,
"productoNombre": "Cemento Portland",
"referencia": "VALE"
}
],
"meta": { "page": 1, "limit": 50, "total": 3, "totalPages": 1 }
}
GET /api/reportes/bin-card-valorado

{
"items": [
{
"id": 86,
"fecha": "2025-10-15T00:00:00.000Z",
"tipo": "ENTRADA",
"cantidad": 50,
"stockAntes": 20,
"stockDespues": 70,
"productoNombre": "Cemento Portland",
"referencia": "COMPRA",
"precioUnit": "73.95",
"entradaBs": "3697.50",
"salidaBs": "0.00",
"saldoBs": "5176.50"
},
{
"id": 88,
"fecha": "2026-07-16T14:22:00.000Z",
"tipo": "SALIDA",
"cantidad": 1,
"stockAntes": 70,
"stockDespues": 69,
"productoNombre": "Cemento Portland",
"referencia": "VALE",
"precioUnit": "73.95",
"entradaBs": "0.00",
"salidaBs": "73.95",
"saldoBs": "5102.55"
}
],
"meta": { "page": 1, "limit": 50, "total": 2, "totalPages": 1 }
}
