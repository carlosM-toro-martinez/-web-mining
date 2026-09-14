import { prisma } from "./config/prisma.js";

// Semilla idempotente (upsert por código) del módulo Caja Chica / Rendición
// de Cuentas de Campamento, transcrita de los PDFs que el usuario adjuntó:
// - Listado de Funciones de Gasto (img20260906_08130411.pdf)
// - Listado de Centros de Costo (img20260906_08182823.pdf)
// - Plan de Cuentas (img20260906_08441676.pdf) — solo el subconjunto
//   estructural que necesita este módulo (cajas, créditos/retenciones
//   fiscales, sueldos, provisiones, costo/gasto, no deducibles). Las
//   ~150 sub-cuentas "IND" de personas individuales del plan completo
//   no se replican aquí; se pueden agregar por CRUD si hacen falta.

type FuncionRow = { codigo: string; nombre: string; tipo: "DISTRIBUIBLE" | "NO_DISTRIBUIBLE" };
type GrupoFuncion = { codigo: string; nombre: string; tipo: "DISTRIBUIBLE" | "NO_DISTRIBUIBLE"; hijos: FuncionRow[] };

const D = "DISTRIBUIBLE" as const;
const N = "NO_DISTRIBUIBLE" as const;

const FUNCIONES_GASTO: GrupoFuncion[] = [
  {
    codigo: "100", nombre: "LABOR", tipo: N,
    hijos: [
      { codigo: "101", nombre: "SUELDOS", tipo: D },
      { codigo: "102", nombre: "JORNALES", tipo: D },
      { codigo: "103", nombre: "CONTRATOS", tipo: D },
      { codigo: "104", nombre: "BONOS Y ASIGNACIONES", tipo: D },
      { codigo: "105", nombre: "BONO PRODUCCION", tipo: D },
      { codigo: "106", nombre: "BONO SOBRE PRODUCCION", tipo: D },
      { codigo: "107", nombre: "BONOS DE COMPENSACION", tipo: D },
      { codigo: "108", nombre: "C.N.S.", tipo: D },
      { codigo: "109", nombre: "AFP PATRONAL", tipo: D },
      { codigo: "110", nombre: "GESTORA PUBLICA PATRONAL", tipo: D },
      { codigo: "111", nombre: "CAJA NACIONAL DE SALUD", tipo: D },
      { codigo: "112", nombre: "INDEMNIZACIONES", tipo: D },
      { codigo: "113", nombre: "AGUINALDOS", tipo: D },
      { codigo: "114", nombre: "SUBSIDIOS (PRENATAL-LACTANCIA-NATALIDAD)", tipo: D },
      { codigo: "115", nombre: "DESAHUCIOS", tipo: D },
      { codigo: "116", nombre: "APORTES SOLIDARIO", tipo: D },
      { codigo: "117", nombre: "APORTE MINERO", tipo: D },
      { codigo: "118", nombre: "APORTE NACIONAL SOLIDARIO", tipo: D },
      { codigo: "119", nombre: "VACACIONES PENDIENTES", tipo: D },
      { codigo: "120", nombre: "GESTORA PUBLICA", tipo: D },
      { codigo: "121", nombre: "GESTORA PUBLICA APORTE SOLIDARIO", tipo: D },
      { codigo: "122", nombre: "EXAMENES PREOCUPACIONALES", tipo: D },
    ],
  },
  {
    codigo: "200", nombre: "MATERIALES", tipo: N,
    hijos: [
      { codigo: "201", nombre: "NITRATO DE AMONIO", tipo: D },
      { codigo: "202", nombre: "DINAMITA-FULMINANTES-GUIA", tipo: N },
      { codigo: "203", nombre: "CALLAPOS Y GRILLETES", tipo: D },
      { codigo: "204", nombre: "MADERAS EN GENERAL", tipo: N },
      { codigo: "205", nombre: "BARRENOS-BROCAS Y OTROS", tipo: N },
      { codigo: "206", nombre: "REPUESTOS PERFORADORAS", tipo: N },
      { codigo: "207", nombre: "LINEA DECAUVILLE Y ACCESORIOS", tipo: D },
      { codigo: "208", nombre: "REPUESTOS Y ACCESORIOS MINA", tipo: D },
      { codigo: "209", nombre: "CAÑERIAS, TUBOS Y ACCESORIOS", tipo: D },
      { codigo: "210", nombre: "CARBURO - CARBURANTES", tipo: D },
      { codigo: "212", nombre: "DOWFROTH", tipo: D },
      { codigo: "213", nombre: "NITRATO DE PLOMO-OXIDO DE ZINC", tipo: D },
      { codigo: "215", nombre: "HIDROXIDO-PEROXIDO-SULFATO", tipo: D },
      { codigo: "216", nombre: "OTROS PRODUCTOS QUIMICOS", tipo: D },
      { codigo: "217", nombre: "MATERIAL DE LABORATORIO", tipo: D },
      { codigo: "218", nombre: "REPUESTOS Y ACCESORIOS INGENIO", tipo: N },
      { codigo: "219", nombre: "SACOS METALEROS", tipo: N },
      { codigo: "220", nombre: "PITA-STOPA-CABLE MANILA", tipo: N },
      { codigo: "221", nombre: "FIERROS-PLANCHAS Y OTROS", tipo: N },
      { codigo: "222", nombre: "TELAS DE ACERO Y CEDAZOS", tipo: N },
      { codigo: "223", nombre: "CORREAS", tipo: D },
      { codigo: "224", nombre: "SOLERAS CHANCADORAS", tipo: N },
      { codigo: "225", nombre: "RODAMIENTOS", tipo: N },
      { codigo: "226", nombre: "ELECTRODOS", tipo: N },
      { codigo: "227", nombre: "CARRETILLAS Y ACCESORIOS", tipo: D },
      { codigo: "228", nombre: "PALAS-PICOTAS Y ACCESORIOS", tipo: D },
      { codigo: "229", nombre: "HERRAMIENTAS Y ACCESORIOS", tipo: D },
      { codigo: "230", nombre: "OVEROLES", tipo: D },
      { codigo: "231", nombre: "ROPA DE AGUA", tipo: D },
      { codigo: "232", nombre: "BOTAS DE GOMA Y PUNTA DE ACERO", tipo: D },
      { codigo: "233", nombre: "CASCO DE SEGURIDAD", tipo: D },
      { codigo: "234", nombre: "OTROS EQUIPOS DE SEGURIDAD", tipo: D },
      { codigo: "235", nombre: "VESTUARIO PERSONAL", tipo: D },
      { codigo: "236", nombre: "COMBUSTIBLES", tipo: D },
      { codigo: "237", nombre: "LUBRICANTES-GRASAS-ANTICONGELAN.-ACEITES", tipo: D },
      { codigo: "238", nombre: "LADRILLOS REFRACTARIOS", tipo: D },
      { codigo: "239", nombre: "CEMENTO-ESTUCO", tipo: N },
      { codigo: "240", nombre: "OTROS MATERIALES DE CONSTRUCCION", tipo: N },
      { codigo: "241", nombre: "ABRAZADERAS-NILPES-PERNOS", tipo: D },
      { codigo: "242", nombre: "FILTROS EN GENERAL", tipo: D },
      { codigo: "243", nombre: "DISCOS DE CORTE", tipo: D },
      { codigo: "244", nombre: "PUNTA CINCEL EN GENERAL", tipo: D },
      { codigo: "245", nombre: "DROGAS Y OTROS MEDICAMENTOS", tipo: N },
      { codigo: "246", nombre: "MATERIALES Y ARTEFACTOS ELECTRICOS", tipo: D },
      { codigo: "247", nombre: "CEPILLOS EN GENERAL", tipo: D },
      { codigo: "248", nombre: "REPUESTOS PARA VEHICULOS", tipo: N },
      { codigo: "249", nombre: "REPUESTOS PARA MAQUINARIA - EQUIPOS", tipo: D },
      { codigo: "250", nombre: "REPUESTOS GRUPOS ELECTROGENOS", tipo: N },
      { codigo: "251", nombre: "REPUESTOS REDUCTORES VELOCIDAD", tipo: N },
      { codigo: "252", nombre: "BARRAS-BOLAS Y SOLERAS MOLINOS", tipo: D },
      { codigo: "253", nombre: "MATERIALES VARIOS", tipo: D },
      { codigo: "254", nombre: "INSTRUMENTAL TECNICO", tipo: D },
      { codigo: "255", nombre: "REPUESTOS Y ACCESORIOS VARIOS", tipo: D },
      { codigo: "256", nombre: "CLAVOS-TORNILLOS-VOLANDAS", tipo: D },
      { codigo: "257", nombre: "INSUMOS VARIOS", tipo: D },
      { codigo: "258", nombre: "MANGUERAS VARIAS", tipo: D },
      { codigo: "259", nombre: "MALLAS EN GENERAL", tipo: D },
      { codigo: "260", nombre: "REPUESTOS MUELAS PARA CHANCADORA", tipo: D },
      { codigo: "261", nombre: "TURRILES DE METAL Y/O PVC", tipo: D },
      { codigo: "262", nombre: "ACCESORIOS DE COMPRESORAS", tipo: D },
      { codigo: "263", nombre: "FULMINATES Y MECHAS", tipo: D },
      { codigo: "264", nombre: "LLANTAS", tipo: D },
      { codigo: "265", nombre: "INVENTARIO DE CHAMI", tipo: D },
      { codigo: "266", nombre: "INVENTARIO DE BROZA", tipo: D },
      { codigo: "267", nombre: "INVENTARIO CONCENTRADO DE COBRE Y AG", tipo: D },
      { codigo: "268", nombre: "RECARGAS DE OXIGENO-GAS LICUADO", tipo: D },
      { codigo: "269", nombre: "MERMA", tipo: D },
    ],
  },
  {
    codigo: "300", nombre: "VARIOS", tipo: N,
    hijos: [
      { codigo: "301", nombre: "MANTENIMIENTO CAMPAMENTOS", tipo: D },
      { codigo: "302", nombre: "MANTENIMIENTO REPARACION VEHICULOS", tipo: N },
      { codigo: "303", nombre: "MANTENIMIENTO MAQUINARIA Y EQUIPO", tipo: N },
      { codigo: "304", nombre: "MANTENIMIENTO REPARACIONES VARIAS", tipo: N },
      { codigo: "305", nombre: "MANTENIMIENTO DE CAMINOS", tipo: D },
      { codigo: "306", nombre: "AMORTIZACION GASTOS CAPITALIZADOS Y DLLO", tipo: D },
      { codigo: "307", nombre: "MANTENIMIENTO COMPUTADORAS Y RADIO BASES", tipo: D },
      { codigo: "310", nombre: "TRANSPORTES MINERALES", tipo: D },
      { codigo: "311", nombre: "TRANSPORTE MATERIALES VARIOS", tipo: D },
      { codigo: "312", nombre: "TRANSPORTE ENVIO MUESTRAS Y REPUESTOS", tipo: D },
      { codigo: "313", nombre: "TRANSPORTE MINERAL(DCTO.COMB.)", tipo: D },
      { codigo: "314", nombre: "DONACIONES Y ASIGNACIONES", tipo: D },
      { codigo: "315", nombre: "ALQUILER VIVIENDA", tipo: N },
      { codigo: "316", nombre: "TELEFONO-TARJETAS RECARGA-COURIER", tipo: D },
      { codigo: "317", nombre: "GASTOS HOSPEDAJE", tipo: D },
      { codigo: "318", nombre: "TRANSPORTE INTERNACIONAL Y LOGISTICA", tipo: D },
      { codigo: "319", nombre: "SERVICIO DE INTERNET-CABLE", tipo: D },
      { codigo: "320", nombre: "SERVICIOS DE ENERGIA ELECTRICA", tipo: D },
      { codigo: "321", nombre: "SERVICIOS DE LIMPIEZA", tipo: D },
      { codigo: "322", nombre: "IMPRENTA-IMPRESIONES-FOTOCOPIAS", tipo: D },
      { codigo: "323", nombre: "SERVICIO DE AGUA", tipo: D },
      { codigo: "324", nombre: "SERVICIOS DE ALIMENTACION Y REFRIGERIOS", tipo: D },
      { codigo: "325", nombre: "GASTOS LEGALES Y JUDICIALES", tipo: N },
      { codigo: "326", nombre: "GASTOS DE VIAJE-PEAJES-PASAJES", tipo: D },
      { codigo: "327", nombre: "GASTOS DE VIAJE EXTERIOR", tipo: N },
      { codigo: "328", nombre: "GASTOS DE REPRESENTACION", tipo: N },
      { codigo: "329", nombre: "GASTOS BANCARIOS", tipo: D },
      { codigo: "330", nombre: "ARTICULOS DE COCINA", tipo: D },
      { codigo: "331", nombre: "ARTICULOS DE LIMPIEZA", tipo: D },
      { codigo: "332", nombre: "COMPRA DE VARIOS PRODUCTOS", tipo: D },
      { codigo: "333", nombre: "OTROS SERVICIOS EN SECTOR", tipo: D },
      { codigo: "334", nombre: "GASTOS DE MOVILIDAD", tipo: N },
      { codigo: "335", nombre: "MATERIAL DE ESCRITORIO", tipo: D },
      { codigo: "336", nombre: "GASTOS ALIMENTACION SECTOR", tipo: D },
      { codigo: "337", nombre: "MANGUERAS VARIAS", tipo: D },
      { codigo: "338", nombre: "IMPUESTOS SOBRE RETENCIONES", tipo: N },
      { codigo: "339", nombre: "IMPUESTOS SOBRE VEHICULOS", tipo: N },
      { codigo: "340", nombre: "IMPUESTOS SOBRE INMUEBLES", tipo: N },
      { codigo: "341", nombre: "ALQUILER DE EQUIPO GEOFISICOS", tipo: D },
      { codigo: "342", nombre: "PATENTES MINERAS", tipo: N },
      { codigo: "343", nombre: "HONORARIOS VARIOS", tipo: N },
      { codigo: "344", nombre: "ALQUILER MAQ.EQUIPO PESADO,OTROS", tipo: N },
      { codigo: "345", nombre: "ALQUILERES VARIOS", tipo: N },
      { codigo: "346", nombre: "VACACIONES", tipo: D },
      { codigo: "347", nombre: "AUDITORIA EXTERNA", tipo: N },
      { codigo: "348", nombre: "ANALISIS MUESTRAS AGUA,SUELO,GASES,RUIDO", tipo: D },
      { codigo: "349", nombre: "GASTOS ALMACENAJE DE VARIOS", tipo: D },
      { codigo: "350", nombre: "ANALISIS QUIMICOS", tipo: N },
      { codigo: "351", nombre: "ELABORACION DE PLANOS Y OTROS", tipo: D },
      { codigo: "352", nombre: "SERV.GEOLOGICOS-GEOFISICA-TOPOGRAFICOS", tipo: D },
      { codigo: "353", nombre: "ENERGIA ELECTRICA", tipo: N },
      { codigo: "354", nombre: "GASTOS EN IMPORTACION", tipo: D },
      { codigo: "355", nombre: "TRABAJOS GEOLOGIA Y EXPLORACION", tipo: D },
      { codigo: "356", nombre: "CONSULTORIA-ASESORAMIENTO", tipo: D },
      { codigo: "357", nombre: "SERVICIOS MEDICOS", tipo: D },
      { codigo: "358", nombre: "OPERADOR DE MAQUINARIAS", tipo: D },
      { codigo: "359", nombre: "GASTOS VARIOS", tipo: N },
      { codigo: "360", nombre: "MINISTERIO DE TRABAJO", tipo: D },
      { codigo: "361", nombre: "SIN CARGOS MTTO.VALOR Y OTROS", tipo: D },
      { codigo: "362", nombre: "INTERESES SOBRE PRESTAMOS", tipo: D },
      { codigo: "363", nombre: "POLIZA DE SEGURO", tipo: D },
      { codigo: "364", nombre: "DESCUENTO EN COMPRAS", tipo: D },
      { codigo: "365", nombre: "TRABAJOS VARIOS SECTOR-CONSTRUCTOR", tipo: D },
      { codigo: "366", nombre: "TRABAJOS VARIOS INTERIOR MINA", tipo: D },
      { codigo: "367", nombre: "CARGUIOS", tipo: D },
      { codigo: "368", nombre: "RETENCIONES IUE/IT N.D.", tipo: D },
      { codigo: "369", nombre: "CNS-GESTORA PUBL.CARGOS ACCESORIOS OTROS", tipo: D },
      { codigo: "370", nombre: "VARIOS COMERCIALIZACION", tipo: D },
      { codigo: "371", nombre: "GASTOS MEDIO AMBIENTE", tipo: D },
      { codigo: "372", nombre: "GASTOS ANALISIS MUESTRAS", tipo: D },
      { codigo: "373", nombre: "GASTOS DIVERSOS N.D.", tipo: D },
      { codigo: "374", nombre: "PASANTIAS Y TRABAJOS VARIOS EN SECTOR", tipo: D },
      { codigo: "375", nombre: "IMPUESTOS TRANSACCIONES", tipo: D },
      { codigo: "376", nombre: "PATENTE MUNICIPAL", tipo: D },
      { codigo: "378", nombre: "AMORTIZACION", tipo: D },
      { codigo: "379", nombre: "IMPUESTOS - IUE", tipo: D },
      { codigo: "380", nombre: "VARIOS", tipo: D },
      { codigo: "388", nombre: "TRANSPORTE FERROVIARIO", tipo: D },
      { codigo: "389", nombre: "ALQUILER DE INGENIO", tipo: D },
      { codigo: "390", nombre: "GASTOS SOAT", tipo: D },
      { codigo: "391", nombre: "PUBLICIDAD EN PRENSA", tipo: D },
      { codigo: "394", nombre: "DESCUENTO EN COMPRAS", tipo: D },
    ],
  },
  {
    codigo: "400", nombre: "GASTOS DE EXPOTACIONES", tipo: D,
    hijos: [
      { codigo: "401", nombre: "GASTOS MARITIMOS POR EXPORTACION", tipo: D },
      { codigo: "402", nombre: "GASTOS DE LOGISTICA PARA EXPORTACION", tipo: D },
      { codigo: "403", nombre: "GASTOS DE TRANSPORTE P/EXPORTACION", tipo: D },
      { codigo: "404", nombre: "SUPERVISION DE OPERACION DE MINERAL", tipo: D },
      { codigo: "405", nombre: "GASTOS VARIOS PARA EXPORTACION", tipo: D },
      { codigo: "406", nombre: "SEGURO DE TRANSPORTE INTERNACIONAL", tipo: D },
      { codigo: "407", nombre: "VERIFICACION Y LOGISTICA P/EXPORTACION", tipo: D },
    ],
  },
  { codigo: "950", nombre: "DEPRECIACION", tipo: N, hijos: [] },
  { codigo: "960", nombre: "GASTOS ADMINISTRATIVOS", tipo: N, hijos: [] },
  { codigo: "970", nombre: "GASTOS FINANCIEROS", tipo: N, hijos: [] },
];

type CentroRow = { codigo: string; nombre: string };
type GrupoCentro = { codigo: string; nombre: string; hijos: CentroRow[] };

const CENTROS_COSTO: GrupoCentro[] = [
  { codigo: "1000", nombre: "EJECUTIVO", hijos: [
    { codigo: "1001", nombre: "DIRECTORIO" },
    { codigo: "1002", nombre: "PRESIDENCIA" },
    { codigo: "1003", nombre: "CONTRALORIA" },
  ]},
  { codigo: "1200", nombre: "ADQUISICIONES", hijos: [
    { codigo: "1201", nombre: "GCIA. ADQUISICIONES" },
    { codigo: "1202", nombre: "ALMACENES" },
    { codigo: "1204", nombre: "IMPORTAC.Y SEGUROS" },
    { codigo: "1205", nombre: "AGENCIA TUPIZA" },
    { codigo: "1206", nombre: "IMPORTACIONES/SEGUROS" },
    { codigo: "1207", nombre: "AGENCIA UYUNI" },
  ]},
  { codigo: "1300", nombre: "ADMINISTRATIVO", hijos: [
    { codigo: "1301", nombre: "DPTO.CONTABILIDAD" },
    { codigo: "1302", nombre: "DPTO.PERSONAL" },
    { codigo: "1303", nombre: "ASESORIA LEGAL" },
    { codigo: "1304", nombre: "SERVICIO DE ADMINISTRACION" },
  ]},
  { codigo: "1400", nombre: "DPTO. COMERCIALIZACION", hijos: [
    { codigo: "1401", nombre: "COMERCIALIZACION" },
  ]},
  { codigo: "1500", nombre: "OPERACIONES TECNICAS", hijos: [
    { codigo: "1501", nombre: "GERENCIA OPERACIONES" },
    { codigo: "1502", nombre: "TALLER MECANICO" },
    { codigo: "1503", nombre: "DPTO.EXPLORACION" },
  ]},
  { codigo: "1600", nombre: "GASTOS NO DISTRIBUIBLES", hijos: [
    { codigo: "1601", nombre: "GASTOS NO DISTRIBUIBLES" },
  ]},
  { codigo: "1700", nombre: "SUPERINTENDENCIA GENERAL", hijos: [
    { codigo: "1701", nombre: "TRATAMIENTO DE MINERAL" },
    { codigo: "1702", nombre: "ADQUISICIONES" },
    { codigo: "1703", nombre: "SEGURIDAD INDUSTRIAL" },
    { codigo: "1704", nombre: "LABORATORIO QUIMICO" },
  ]},
  { codigo: "1800", nombre: "MINA", hijos: [
    { codigo: "1801", nombre: "SUPERINTENDENCIA MINA" },
    { codigo: "1802", nombre: "OFICINA TECNICA" },
    { codigo: "1803", nombre: "SUPERVISION MINA" },
    { codigo: "1804", nombre: "COSTO MINA" },
    { codigo: "1806", nombre: "JEFE DE PUNTA MINA" },
  ]},
  { codigo: "1900", nombre: "INTERIOR MINA", hijos: [
    { codigo: "1901", nombre: "DESARROLLO Y RECONOCIMIENTO" },
    { codigo: "1902", nombre: "PERFORACION CON DIAMANTINA" },
    { codigo: "1903", nombre: "PROFUNDIZACION CUADRO" },
    { codigo: "1904", nombre: "DESARROLLO HORIZONTAL" },
    { codigo: "1905", nombre: "DESARROLLO VERTICAL" },
  ]},
  { codigo: "2000", nombre: "QUEBRADURA", hijos: [
    { codigo: "2001", nombre: "RAJOS EN SOLIDO-CORTE-RELLENO" },
    { codigo: "2002", nombre: "RAJOS EN SOLIDO-ACOPIO" },
    { codigo: "2003", nombre: "RAJOS EN TAQUEOS" },
    { codigo: "2004", nombre: "EXPLOTACION A CIELO ABIERTO" },
  ]},
  { codigo: "2100", nombre: "EXTRACCION", hijos: [
    { codigo: "2101", nombre: "HORIZONTAL ACARREO A MANO" },
    { codigo: "2102", nombre: "HORIZONTAL ACARREO A MAQUINA" },
    { codigo: "2103", nombre: "VERTICAL IZAMIENTO CUADRO" },
    { codigo: "2106", nombre: "CARGUIO PALA NEUMATICA" },
    { codigo: "2107", nombre: "PARRILLA INT/MINA-EXT/MINA" },
  ]},
  { codigo: "2200", nombre: "MANTENIMIENTO", hijos: [
    { codigo: "2201", nombre: "GALERIAS" },
    { codigo: "2202", nombre: "CUADROS" },
    { codigo: "2203", nombre: "COMPRA MINERALES-BROZA" },
    { codigo: "2204", nombre: "EXPLOTACION DESMONTE" },
  ]},
  { codigo: "2800", nombre: "MAESTRANZA", hijos: [
    { codigo: "2801", nombre: "MANTENIMIENTO" },
    { codigo: "2802", nombre: "MECANICOS MAESTRANZA" },
    { codigo: "2804", nombre: "TORNOS" },
    { codigo: "2805", nombre: "MAQUINAS PERFORADORAS" },
    { codigo: "2806", nombre: "MECANICOS PALA NEUMATICA" },
  ]},
  { codigo: "2900", nombre: "BOMBAS", hijos: [
    { codigo: "2902", nombre: "BOMBAS MINA" },
  ]},
  { codigo: "3000", nombre: "TALLER ELECTRICO", hijos: [
    { codigo: "3001", nombre: "JEFE TALLER ELECTRICO" },
    { codigo: "3002", nombre: "LAMPARERIA" },
    { codigo: "3003", nombre: "REEMBOBINADO" },
    { codigo: "3004", nombre: "SUB-ESTACION ELECTRICA" },
    { codigo: "3005", nombre: "ELECTRICISTA" },
  ]},
  { codigo: "3100", nombre: "CASA DE MAQUINAS", hijos: [
    { codigo: "3101", nombre: "MEDIO AMBIENTE" },
    { codigo: "3102", nombre: "GRUPOS ELECTROGENOS" },
    { codigo: "3103", nombre: "COMPRESORAS" },
  ]},
  { codigo: "3200", nombre: "TRANSPORTE Y VEHICULOS", hijos: [
    { codigo: "3201", nombre: "EQUIPO PESADO" },
    { codigo: "3202", nombre: "CISTERNA DIESEL" },
    { codigo: "3203", nombre: "VOLQUETAS" },
    { codigo: "3204", nombre: "CAMIONETAS" },
    { codigo: "3205", nombre: "JEEPS" },
    { codigo: "3206", nombre: "PALAS" },
    { codigo: "3207", nombre: "TRACTORES" },
  ]},
  { codigo: "3400", nombre: "ADMINISTRACION", hijos: [
    { codigo: "3401", nombre: "ADMINISTRACION" },
    { codigo: "3403", nombre: "ALMACENES" },
    { codigo: "3405", nombre: "SERENO" },
  ]},
  { codigo: "3600", nombre: "BIENESTAR", hijos: [
    { codigo: "3601", nombre: "VARIOS" },
    { codigo: "3602", nombre: "RANCHO-CLUBS-CASA HUESPEDES" },
    { codigo: "3611", nombre: "REFACCION VIVIENDAS CAMPAMENTO" },
  ]},
  { codigo: "3700", nombre: "OFICINA CENTRAL", hijos: [
    { codigo: "3701", nombre: "DEPRECIACION ACTIVO FIJO" },
    { codigo: "3704", nombre: "TRANSPORTE" },
    { codigo: "3902", nombre: "OPERADORES EQUIPO PESADO" },
    { codigo: "3903", nombre: "PERFORACION" },
    { codigo: "3904", nombre: "CALICHEROS" },
    { codigo: "3905", nombre: "MAQUINARIA,EQUIPO PESADO,OTROS" },
    { codigo: "3906", nombre: "PROVISION CAL" },
  ]},
  { codigo: "4000", nombre: "PLANTA", hijos: [
    { codigo: "4001", nombre: "GASTOS COMERCIALIZACION" },
    { codigo: "4002", nombre: "CARGADO" },
    { codigo: "4003", nombre: "HORNOS" },
    { codigo: "4004", nombre: "DESCARGA" },
    { codigo: "4005", nombre: "TRITURACION" },
    { codigo: "4006", nombre: "ALMACENAJE" },
    { codigo: "4007", nombre: "TRANSPORTE TERCEROS" },
    { codigo: "4008", nombre: "OPERADORES PLANTA" },
  ]},
  { codigo: "4100", nombre: "ADMINISTRACION PLANTA", hijos: [
    { codigo: "4101", nombre: "ADMINISTRADOR GENERAL" },
    { codigo: "4102", nombre: "SERENO" },
    { codigo: "4103", nombre: "ALMACENES" },
    { codigo: "4104", nombre: "RANCHO Y CLUBS" },
    { codigo: "4105", nombre: "CAMPAMENTOS" },
    { codigo: "4106", nombre: "ATENCION ESCOLAR" },
    { codigo: "4107", nombre: "AGENCIA COCHABAMBA" },
  ]},
  { codigo: "4200", nombre: "DISTRIBUIBLES", hijos: [] },
  { codigo: "4300", nombre: "MANTENIMIENTO PLANTA", hijos: [
    { codigo: "4301", nombre: "ENCARGADO MANTENIMIENTO" },
    { codigo: "4302", nombre: "MECANICO" },
    { codigo: "4304", nombre: "AYUDANTE MECANICO" },
  ]},
  { codigo: "4400", nombre: "TRANSPORTE Y OTROS", hijos: [
    { codigo: "4401", nombre: "TRANSPORTE" },
    { codigo: "4402", nombre: "EQUIPO PESADO" },
    { codigo: "4403", nombre: "LABORATORIO QUIMICO" },
    { codigo: "4404", nombre: "PESAJE" },
    { codigo: "4405", nombre: "COMPRESORA" },
    { codigo: "4409", nombre: "TRACTO-CAMIONES CAL VIVA" },
    { codigo: "4410", nombre: "ALQUILER TRACTO" },
  ]},
  { codigo: "5000", nombre: "OTROS", hijos: [] },
  { codigo: "5100", nombre: "DEPRECIACION ACTIVO FIJO", hijos: [
    { codigo: "5101", nombre: "DEPRECIACION ACTIVO FIJO" },
  ]},
  { codigo: "9500", nombre: "DEPRECIACION", hijos: [] },
];

const CUENTAS_CONTABLES_CAJA = [
  { codigo: "10.001.000", nombre: "CAJA LA PAZ BOLIVIANOS", clase: "MAY", nivel: 2, monedaCodigo: "A", requiereCentroCosto: false, requiereFuncionGasto: false },
  { codigo: "10.002.000", nombre: "CAJA LA PAZ DOLARES", clase: "MAY", nivel: 2, monedaCodigo: "B", requiereCentroCosto: false, requiereFuncionGasto: false },
  { codigo: "10.003.000", nombre: "CAJA BOLIVIANOS LIPEÑA", clase: "MAY", nivel: 2, monedaCodigo: "B", requiereCentroCosto: false, requiereFuncionGasto: false },
  { codigo: "16.001.011", nombre: "ANTICIPOS A PROVEEDORES", clase: "IND", nivel: 2, monedaCodigo: "A", requiereCentroCosto: false, requiereFuncionGasto: false },
  { codigo: "36.002.000", nombre: "EQUIPOS DE COMPUTACION LIPEÑA", clase: "MAY", nivel: 2, monedaCodigo: "A", requiereCentroCosto: false, requiereFuncionGasto: false },
  { codigo: "37.002.000", nombre: "MUEBLES Y ENSERES LIPEÑA", clase: "MAY", nivel: 2, monedaCodigo: "A", requiereCentroCosto: false, requiereFuncionGasto: false },
  { codigo: "42.002.000", nombre: "OBRAS EN CONSTRUCCION LIPEÑA", clase: "MAY", nivel: 2, monedaCodigo: "B", requiereCentroCosto: false, requiereFuncionGasto: false },
  { codigo: "50.002.000", nombre: "CUENTA COMPENSACION LIPEÑA", clase: "MAY", nivel: 2, monedaCodigo: "A", requiereCentroCosto: false, requiereFuncionGasto: false },
  { codigo: "69.001.000", nombre: "CREDITO FISCAL", clase: "MAY", nivel: 2, monedaCodigo: "A", requiereCentroCosto: false, requiereFuncionGasto: false },
  { codigo: "69.005.000", nombre: "RC-IVA RETENCIONES SERVICIOS", clase: "MAY", nivel: 2, monedaCodigo: "A", requiereCentroCosto: false, requiereFuncionGasto: false },
  { codigo: "69.006.000", nombre: "I.U.E. RETENCIONES COMPRAS", clase: "MAY", nivel: 2, monedaCodigo: "A", requiereCentroCosto: false, requiereFuncionGasto: false },
  { codigo: "69.007.000", nombre: "IMPTO.TRANSACCIONES RETENCIONES", clase: "MAY", nivel: 2, monedaCodigo: "A", requiereCentroCosto: false, requiereFuncionGasto: false },
  { codigo: "85.001.000", nombre: "SUELDOS Y JORNALES POR PAGAR", clase: "MAY", nivel: 2, monedaCodigo: "A", requiereCentroCosto: false, requiereFuncionGasto: false },
  { codigo: "88.001.000", nombre: "PROVISION AGUINALDOS", clase: "MAY", nivel: 2, monedaCodigo: "A", requiereCentroCosto: false, requiereFuncionGasto: false },
  { codigo: "100.001.000", nombre: "COSTO DE PRODUCCION LIPEÑA", clase: "MAY", nivel: 3, monedaCodigo: "A", requiereCentroCosto: true, requiereFuncionGasto: true },
  { codigo: "116.001.000", nombre: "GASTOS ADMINISTRATIVOS", clase: "MAY", nivel: 3, monedaCodigo: "A", requiereCentroCosto: true, requiereFuncionGasto: true },
  { codigo: "118.001.000", nombre: "GASTOS NO DEDUCIBLES", clase: "MAY", nivel: 3, monedaCodigo: "B", requiereCentroCosto: false, requiereFuncionGasto: false },
  { codigo: "134.001.000", nombre: "OPERACIONES FUERA DEL COSTO", clase: "MAY", nivel: 3, monedaCodigo: "A", requiereCentroCosto: false, requiereFuncionGasto: true },
] as const;

const CAJAS = [
  { codigo: "10.001.000", nombre: "Caja La Paz Bolivianos", monedaBase: "BOB", encargadoNombre: null },
  { codigo: "10.002.000", nombre: "Caja La Paz Dólares", monedaBase: "USD", encargadoNombre: null },
  // Nombre real del administrador de la Caja Lipeña, tal como aparece en los
  // reportes mensuales impresos que sirvieron de referencia para este módulo.
  { codigo: "10.003.000", nombre: "Caja Bolivianos Lipeña", monedaBase: "BOB", encargadoNombre: "Daniel Fiorilo Zenteno" },
] as const;

// Tasas estándar de Bolivia confirmadas por el usuario — editables después
// desde el CRUD de conceptos de retención, nunca hardcodeadas en el motor.
const RETENCIONES = [
  { codigo: "RC_IVA", nombre: "RC-IVA Retenciones Servicios", porcentaje: 13, cuentaCodigo: "69.005.000" },
  { codigo: "IUE_COMPRAS", nombre: "IUE Retención Compras/Alimentación", porcentaje: 12.5, cuentaCodigo: "69.006.000" },
  { codigo: "IT", nombre: "Impuesto a las Transacciones (IT) Retenciones", porcentaje: 3, cuentaCodigo: "69.007.000" },
] as const;

async function seedFuncionesGasto() {
  for (const grupo of FUNCIONES_GASTO) {
    const padre = await prisma.funcionGastoCaja.upsert({
      where: { codigo: grupo.codigo },
      create: { codigo: grupo.codigo, nombre: grupo.nombre, tipo: grupo.tipo, parentId: null },
      update: { nombre: grupo.nombre, tipo: grupo.tipo },
    });

    for (const hijo of grupo.hijos) {
      await prisma.funcionGastoCaja.upsert({
        where: { codigo: hijo.codigo },
        create: { codigo: hijo.codigo, nombre: hijo.nombre, tipo: hijo.tipo, parentId: padre.id },
        update: { nombre: hijo.nombre, tipo: hijo.tipo, parentId: padre.id },
      });
    }
  }
  console.log(`Funciones de gasto: ${FUNCIONES_GASTO.length} grupos sembrados.`);
}

async function seedCentrosCosto() {
  for (const grupo of CENTROS_COSTO) {
    const padre = await prisma.centroCostoCaja.upsert({
      where: { codigo: grupo.codigo },
      create: { codigo: grupo.codigo, nombre: grupo.nombre, parentId: null },
      update: { nombre: grupo.nombre },
    });

    for (const hijo of grupo.hijos) {
      await prisma.centroCostoCaja.upsert({
        where: { codigo: hijo.codigo },
        create: { codigo: hijo.codigo, nombre: hijo.nombre, parentId: padre.id },
        update: { nombre: hijo.nombre, parentId: padre.id },
      });
    }
  }
  console.log(`Centros de costo: ${CENTROS_COSTO.length} grupos sembrados.`);
}

async function seedCuentasContables() {
  for (const cuenta of CUENTAS_CONTABLES_CAJA) {
    await prisma.cuentaContableCaja.upsert({
      where: { codigo: cuenta.codigo },
      create: {
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        clase: cuenta.clase as "BAL" | "IND" | "MAY",
        nivel: cuenta.nivel,
        monedaCodigo: cuenta.monedaCodigo,
        requiereCentroCosto: cuenta.requiereCentroCosto,
        requiereFuncionGasto: cuenta.requiereFuncionGasto,
      },
      update: {
        nombre: cuenta.nombre,
        clase: cuenta.clase as "BAL" | "IND" | "MAY",
        nivel: cuenta.nivel,
        monedaCodigo: cuenta.monedaCodigo,
        requiereCentroCosto: cuenta.requiereCentroCosto,
        requiereFuncionGasto: cuenta.requiereFuncionGasto,
      },
    });
  }
  console.log(`Cuentas contables de caja: ${CUENTAS_CONTABLES_CAJA.length} sembradas.`);
}

async function seedCajas() {
  for (const caja of CAJAS) {
    const existente = await prisma.cajaChica.findUnique({ where: { codigo: caja.codigo } });
    await prisma.cajaChica.upsert({
      where: { codigo: caja.codigo },
      create: {
        codigo: caja.codigo,
        nombre: caja.nombre,
        monedaBase: caja.monedaBase as "BOB" | "USD",
        encargadoNombre: caja.encargadoNombre,
      },
      // No pisa el encargado si ya se editó a mano desde Parámetros — el
      // seed solo lo completa la primera vez que se crea la caja.
      update: {
        nombre: caja.nombre,
        monedaBase: caja.monedaBase as "BOB" | "USD",
        ...(existente?.encargadoNombre == null && caja.encargadoNombre
          ? { encargadoNombre: caja.encargadoNombre }
          : {}),
      },
    });
  }
  console.log(`Cajas chicas: ${CAJAS.length} sembradas.`);
}

async function seedRetenciones() {
  for (const retencion of RETENCIONES) {
    const cuenta = await prisma.cuentaContableCaja.findUnique({ where: { codigo: retencion.cuentaCodigo } });
    if (!cuenta) {
      console.warn(`No se encontró la cuenta ${retencion.cuentaCodigo} para el concepto ${retencion.codigo}, se omite.`);
      continue;
    }

    await prisma.conceptoRetencionCaja.upsert({
      where: { codigo: retencion.codigo as "RC_IVA" | "IUE_COMPRAS" | "IT" },
      create: {
        codigo: retencion.codigo as "RC_IVA" | "IUE_COMPRAS" | "IT",
        nombre: retencion.nombre,
        porcentaje: retencion.porcentaje,
        cuentaContableCajaId: cuenta.id,
      },
      update: {
        nombre: retencion.nombre,
        porcentaje: retencion.porcentaje,
        cuentaContableCajaId: cuenta.id,
      },
    });
  }
  console.log(`Conceptos de retención: ${RETENCIONES.length} sembrados.`);
}

async function seedCajaChica() {
  try {
    await seedFuncionesGasto();
    await seedCentrosCosto();
    await seedCuentasContables();
    await seedCajas();
    await seedRetenciones();
    console.log("Semilla de Caja Chica completada.");
  } catch (error) {
    console.error("Error al sembrar datos de Caja Chica:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedCajaChica();
