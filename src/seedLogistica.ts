import { prisma } from "./config/prisma.js";

// Semilla idempotente de los datos REALES de Logística: la flota de
// transportistas/volquetas/choferes (transcrita de la "Nota de Remisión
// Volquetas"), los catálogos de municipio/tipo de mineral/ingenio y las
// tarifas fijas vigentes, todo confirmado por el usuario. Marcado
// esSemilla=true para que logisticaReset.service.ts (el botón "reiniciar
// Logística" de Parámetros) nunca lo borre, aunque sí siga borrando todo
// lo demás (lotes, liquidaciones, F101, y cualquier transportista/flota/
// catálogo/tarifa que el usuario cree a mano para probar).
//
// Datos que NO vienen en la Nota de Remisión y quedan como placeholder,
// editables después (NIT/CI desde Logística > Flota > Transportistas; la
// capacidad y el CI de cada volqueta/chofer por ahora solo vía Prisma
// Studio, ya que esos 2 módulos todavía no tienen un botón de "editar" en
// el frontend):
// - nitOCi de cada transportista
// - ci de cada chofer
// - capacidadTon de cada volqueta (se usa 7, el tonelaje típico de un
//   viaje ya usado como ejemplo en el resto de la app)

type TipoEntidad = "EMPRESA" | "TRABAJADOR_PARTICULAR";

interface VehiculoSemilla {
  placa: string;
  conductor: string;
}

interface TransportistaSemilla {
  nombre: string;
  tipoEntidad: TipoEntidad;
  vehiculos: VehiculoSemilla[];
}

const CAPACIDAD_TON_DEFAULT = 7;

const TRANSPORTISTAS: TransportistaSemilla[] = [
  {
    nombre: "EMUSA",
    tipoEntidad: "EMPRESA",
    vehiculos: [
      { placa: "6657 DZH", conductor: "JUAN NINA" },
      { placa: "6657 DYE", conductor: "EDWIN TAPIA" },
      { placa: "6480 DBB", conductor: "WILFREDO TICONA" },
      { placa: "6480 DDH", conductor: "OVIDIO RAMOS" },
      { placa: "6422 LZD", conductor: "SIMON CRUZ" },
    ],
  },
  {
    nombre: "JUAN FARFAN",
    tipoEntidad: "TRABAJADOR_PARTICULAR",
    vehiculos: [{ placa: "1923 UZH", conductor: "JESUSO FAJARDO" }],
  },
  {
    nombre: "MIGUEL TIJRA",
    tipoEntidad: "TRABAJADOR_PARTICULAR",
    vehiculos: [
      { placa: "1630 UGE", conductor: "WILFREDO ARUQUIPA" },
      { placa: "2797 PCA", conductor: "MARCO ZEBALLOS" },
      { placa: "2263 PKI", conductor: "HECTOR QUISPE" },
      { placa: "1397 LGH", conductor: "JESUS COPA" },
    ],
  },
  {
    nombre: "PUNTUALIDAD",
    tipoEntidad: "EMPRESA",
    vehiculos: [
      { placa: "3120 IZR", conductor: "GARY BOLIVAR" },
      { placa: "3120 KBX", conductor: "ABEL RAMOS" },
    ],
  },
  {
    nombre: "ROGER QUISPE",
    tipoEntidad: "TRABAJADOR_PARTICULAR",
    vehiculos: [
      { placa: "2824 TEE", conductor: "MIGUEL SANDI" },
      { placa: "1497 DYL", conductor: "FERNANDO SANDI" },
      { placa: "1117 LSA", conductor: "EDGAR SANDI" },
      { placa: "2343 EKE", conductor: "ALFREDO SANDI" },
      { placa: "1264 FYT", conductor: "MARCO SANDI" },
      { placa: "1190 ITF", conductor: "IVER MURILLO" },
      { placa: "2075 ZFB", conductor: "MARVIN RAMOS" },
      { placa: "1529 HKX", conductor: "FELIX VASQUEZ" },
      { placa: "697 NPF", conductor: "EDWIN SANDI" },
      { placa: "598 ULI", conductor: "WALTER CHOQUE" },
      { placa: "1447 TKH", conductor: "VICENTE SAAVEDRA" },
      { placa: "826 UUT", conductor: "FELIPE ROJAS" },
    ],
  },
];

function slug(nombre: string) {
  return nombre.trim().toUpperCase().replace(/\s+/g, "-");
}

async function seedTransportistasYFlota() {
  let transportistasCreados = 0;
  let vehiculosCreados = 0;
  let choferesCreados = 0;

  for (const t of TRANSPORTISTAS) {
    let transportista = await prisma.transportista.findFirst({ where: { nombreORazonSocial: t.nombre } });
    if (!transportista) {
      transportista = await prisma.transportista.create({
        data: {
          tipoEntidad: t.tipoEntidad,
          nombreORazonSocial: t.nombre,
          nitOCi: `PENDIENTE-${slug(t.nombre)}`,
          esSemilla: true,
        },
      });
      transportistasCreados += 1;
    } else if (!transportista.esSemilla) {
      // Ya existía (creado a mano antes de esta semilla) — se marca como
      // semilla para que quede protegido del reinicio, sin tocar el resto
      // de sus datos (nombre, NIT, banco... los que el usuario ya cargó).
      await prisma.transportista.update({ where: { id: transportista.id }, data: { esSemilla: true } });
    }

    for (const v of t.vehiculos) {
      const ciPlaceholder = `PENDIENTE-${slug(v.conductor)}`;
      const choferExistente = await prisma.chofer.findUnique({ where: { ci: ciPlaceholder } });
      if (!choferExistente) {
        await prisma.chofer.create({ data: { nombre: v.conductor, ci: ciPlaceholder, esSemilla: true } });
        choferesCreados += 1;
      } else if (!choferExistente.esSemilla) {
        await prisma.chofer.update({ where: { id: choferExistente.id }, data: { esSemilla: true } });
      }

      const vehiculoExistente = await prisma.vehiculo.findUnique({ where: { placa: v.placa } });
      if (!vehiculoExistente) {
        await prisma.vehiculo.create({
          data: {
            placa: v.placa,
            tipo: "VOLQUETA",
            capacidadTon: CAPACIDAD_TON_DEFAULT,
            propietarioId: transportista.id,
            esSemilla: true,
          },
        });
        vehiculosCreados += 1;
      } else if (!vehiculoExistente.esSemilla) {
        await prisma.vehiculo.update({ where: { id: vehiculoExistente.id }, data: { esSemilla: true } });
      }
    }
  }

  console.log(
    `Flota real sembrada: ${transportistasCreados} transportista(s), ${vehiculosCreados} volqueta(s), ${choferesCreados} chofer(es) nuevos (el resto ya existía y solo se marcó como protegido).`,
  );
}

const MUNICIPIOS = [
  { codigo: "51028", nombre: "Mojinete" },
  { codigo: "51015", nombre: "San Pablo" },
];

const TIPOS_MINERAL = [{ codigo: "C-CH", nombre: "Carga Chami" }];

const INGENIOS = [{ codigo: "CH", nombre: "Chilcobija" }];

async function seedCatalogos() {
  let creados = 0;

  for (const m of MUNICIPIOS) {
    const existente = await prisma.municipioOrigen.findUnique({ where: { codigo: m.codigo } });
    if (!existente) {
      await prisma.municipioOrigen.create({ data: { ...m, esSemilla: true } });
      creados += 1;
    } else if (!existente.esSemilla) {
      await prisma.municipioOrigen.update({ where: { id: existente.id }, data: { esSemilla: true } });
    }
  }

  for (const t of TIPOS_MINERAL) {
    const existente = await prisma.tipoMineral.findUnique({ where: { codigo: t.codigo } });
    if (!existente) {
      await prisma.tipoMineral.create({ data: { ...t, esSemilla: true } });
      creados += 1;
    } else if (!existente.esSemilla) {
      await prisma.tipoMineral.update({ where: { id: existente.id }, data: { esSemilla: true } });
    }
  }

  for (const i of INGENIOS) {
    const existente = await prisma.ingenio.findUnique({ where: { codigo: i.codigo } });
    if (!existente) {
      await prisma.ingenio.create({ data: { ...i, esSemilla: true } });
      creados += 1;
    } else if (!existente.esSemilla) {
      await prisma.ingenio.update({ where: { id: existente.id }, data: { esSemilla: true } });
    }
  }

  console.log(`Catálogos sembrados: ${creados} nuevo(s) (el resto ya existía y solo se marcó como protegido).`);
}

// Precios fijos (genéricos: aplican a cualquier transportista de ese tipo,
// cualquier mineral) confirmados por el usuario. vigenteDesde se puso
// deliberadamente en el pasado (no "hoy"): un lote con fecha de despacho
// ANTERIOR a vigenteDesde no encuentra tarifa aplicable y bloquea la
// liquidación (buscarTarifaAplicable exige vigenteDesde <= fecha del lote).
// La primera vez se sembró con la fecha de hoy y eso rompió la liquidación
// de lotes ya despachados un día antes — se corrige acá hacia atrás lo
// suficiente para cubrir cualquier lote histórico ya registrado.
const VIGENTE_DESDE_TARIFAS_SEMILLA = new Date("2025-01-01");

interface TarifaSemilla {
  tipoEntidad: TipoEntidad;
  incluyeCombustible: "CON_COMBUSTIBLE" | "SIN_COMBUSTIBLE" | null;
  precioPorTonelada: number;
}

const TARIFAS: TarifaSemilla[] = [
  { tipoEntidad: "TRABAJADOR_PARTICULAR", incluyeCombustible: "SIN_COMBUSTIBLE", precioPorTonelada: 336.41 },
  { tipoEntidad: "TRABAJADOR_PARTICULAR", incluyeCombustible: "CON_COMBUSTIBLE", precioPorTonelada: 200 },
  { tipoEntidad: "EMPRESA", incluyeCombustible: null, precioPorTonelada: 167.04 },
];

async function seedTarifas() {
  let creadas = 0;
  let corregidas = 0;

  for (const t of TARIFAS) {
    const existente = await prisma.tarifaLiquidacion.findFirst({
      where: {
        tipoEntidad: t.tipoEntidad,
        transportistaId: null,
        tipoMineralId: null,
        incluyeCombustible: t.incluyeCombustible,
      },
    });
    if (!existente) {
      await prisma.tarifaLiquidacion.create({
        data: {
          tipoEntidad: t.tipoEntidad,
          incluyeCombustible: t.incluyeCombustible,
          precioPorTonelada: t.precioPorTonelada,
          vigenteDesde: VIGENTE_DESDE_TARIFAS_SEMILLA,
          esSemilla: true,
        },
      });
      creadas += 1;
    } else {
      const necesitaFix =
        !existente.esSemilla || existente.vigenteDesde.getTime() !== VIGENTE_DESDE_TARIFAS_SEMILLA.getTime();
      if (necesitaFix) {
        await prisma.tarifaLiquidacion.update({
          where: { id: existente.id },
          data: { esSemilla: true, vigenteDesde: VIGENTE_DESDE_TARIFAS_SEMILLA },
        });
        corregidas += 1;
      }
    }
  }

  console.log(
    `Tarifas fijas sembradas: ${creadas} nueva(s), ${corregidas} corregida(s) (vigenteDesde/protección), el resto ya estaba bien.`,
  );
}

async function seedLogistica() {
  try {
    await seedTransportistasYFlota();
    await seedCatalogos();
    await seedTarifas();
    console.log("Semilla de Logística completada.");
  } catch (error) {
    console.error("Error al sembrar datos de Logística:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedLogistica();
