import { prisma } from "./config/prisma.js";

// Importación de una sola vez del "Cuadro de envío de Carga Chami de Mina
// Lipeña a Chilcobija — Octubre 2026" que el usuario adjuntó. Cada fila se
// crea como LoteDespacho + ConocimientoCarga + Formulario101 vinculado, SIN
// pesaje (el usuario lo va a registrar él mismo luego, a mano) y en estado
// EN_TRANSITO para todos, por instrucción explícita.
//
// Decisiones confirmadas / tomadas:
// - El correlativo se preserva EXACTO del Conocimiento físico ("N/10", sin
//   ceros a la izquierda — así es como ya lo genera el sistema, confirmado
//   contra los lotes 1/10 y 2/10 que ya existían en la base).
// - Transportista y chofer se resuelven por PLACA y por NOMBRE del chofer
//   contra lo ya sembrado en seedLogistica.ts (no se parsea la columna
//   "Propietario" del Excel, para no arrastrar errores de tipeo/variantes
//   de nombre).
// - La columna "combustible" (150/170/vacío) decide incluyeCombustible +
//   combustibleAsignadoLitros.
// - "PESO Kg" se interpreta directo como TONELADAS (26.399 = 26.399 ton,
//   no 26.399 kg) — pero de todos modos NO se usa acá: no se crea pesaje
//   para ninguna fila, por instrucción del usuario.
// - NO se toca vehiculo.estadoActual: varios vehículos de esta hoja
//   aparecen en más de una fila (ej. 1387 LGH en la 4/10 y la 14/10), y ese
//   campo solo puede reflejar UN lote activo a la vez — tocarlo rompería
//   esa relación 1-a-1. Completar cada uno se hace desde /logistica/lotes
//   (buscando por correlativo o Nº de F101), no desde /logistica/flota.
//
// Filas que NO se importan (ya existían en la base, de pruebas previas):
// - 1/10 y 2/10: ya están ACOPIADO con su pesaje real, coinciden con la
//   hoja — se dejan intactas.
// - 3/10: el número YA está tomado por un lote ANULADO de pruebas (con un
//   peso que no coincide con esta hoja) — un correlativo anulado nunca se
//   reutiliza (igual que un talonario físico), así que la fila 3 del Excel
//   (HECTOR QUISPE / 2263 PKI / Carga Chami / 150 L combustible) queda
//   PENDIENTE de crear a mano con el próximo número disponible.

interface FilaImportar {
  correlativo: string;
  fecha: string; // YYYY-MM-DD
  f101: string;
  municipioCodigo: string;
  nivel: string;
  placa: string;
  choferNombre: string;
  combustibleLitros: number | null;
}

const FILAS: FilaImportar[] = [
  { correlativo: "4/10", fecha: "2026-10-01", f101: "218959", municipioCodigo: "51028", nivel: "Nivel 0", placa: "1387 LGH", choferNombre: "JESUS COPA", combustibleLitros: 150 },
  { correlativo: "5/10", fecha: "2026-10-01", f101: "218960", municipioCodigo: "51015", nivel: "La Moza", placa: "6480 DDH", choferNombre: "OVIDIO RAMOS", combustibleLitros: null },
  { correlativo: "6/10", fecha: "2026-10-01", f101: "218961", municipioCodigo: "51015", nivel: "La Moza", placa: "6422 LZD", choferNombre: "SIMON CRUZ", combustibleLitros: null },
  { correlativo: "7/10", fecha: "2026-10-02", f101: "218967", municipioCodigo: "51015", nivel: "La Moza", placa: "6480 DBB", choferNombre: "WILFREDO TICONA", combustibleLitros: null },
  { correlativo: "8/10", fecha: "2026-10-02", f101: "218968", municipioCodigo: "51015", nivel: "La Moza", placa: "1923 UZH", choferNombre: "JESUSO FAJARDO", combustibleLitros: 150 },
  { correlativo: "9/10", fecha: "2026-10-02", f101: "218969", municipioCodigo: "51015", nivel: "La Moza", placa: "1630 UGE", choferNombre: "WILFREDO ARUQUIPA", combustibleLitros: 150 },
  { correlativo: "10/10", fecha: "2026-10-02", f101: "218970", municipioCodigo: "51015", nivel: "La Moza", placa: "2797 PCA", choferNombre: "MARCO ZEBALLOS", combustibleLitros: 150 },
  { correlativo: "11/10", fecha: "2026-10-02", f101: "218971", municipioCodigo: "51015", nivel: "La Moza", placa: "6657 DZH", choferNombre: "JUAN NINA", combustibleLitros: null },
  { correlativo: "12/10", fecha: "2026-10-02", f101: "218972", municipioCodigo: "51015", nivel: "La Moza", placa: "6657 DYE", choferNombre: "EDWIN TAPIA", combustibleLitros: null },
  { correlativo: "13/10", fecha: "2026-10-02", f101: "218973", municipioCodigo: "51015", nivel: "La Moza", placa: "2263 PKI", choferNombre: "HECTOR QUISPE", combustibleLitros: 150 },
  { correlativo: "14/10", fecha: "2026-10-02", f101: "218974", municipioCodigo: "51015", nivel: "La Moza", placa: "1387 LGH", choferNombre: "JESUS COPA", combustibleLitros: 150 },
  { correlativo: "15/10", fecha: "2026-10-02", f101: "218975", municipioCodigo: "51015", nivel: "La Moza", placa: "2824 TEE", choferNombre: "MIGUEL SANDI", combustibleLitros: 170 },
  { correlativo: "16/10", fecha: "2026-10-02", f101: "218976", municipioCodigo: "51015", nivel: "La Moza", placa: "1497 DYL", choferNombre: "FERNANDO SANDI", combustibleLitros: 170 },
  { correlativo: "17/10", fecha: "2026-10-02", f101: "218977", municipioCodigo: "51015", nivel: "La Moza", placa: "1117 LSA", choferNombre: "EDGAR SANDI", combustibleLitros: 170 },
  { correlativo: "18/10", fecha: "2026-10-02", f101: "218978", municipioCodigo: "51015", nivel: "La Moza", placa: "2343 EKE", choferNombre: "ALFREDO SANDI", combustibleLitros: 170 },
  { correlativo: "19/10", fecha: "2026-10-02", f101: "218979", municipioCodigo: "51015", nivel: "La Moza", placa: "1264 FYT", choferNombre: "MARCO SANDI", combustibleLitros: 170 },
  { correlativo: "20/10", fecha: "2026-10-02", f101: "218980", municipioCodigo: "51015", nivel: "La Moza", placa: "1190 ITF", choferNombre: "IVER MURILLO", combustibleLitros: 170 },
  { correlativo: "21/10", fecha: "2026-10-02", f101: "218981", municipioCodigo: "51015", nivel: "La Moza", placa: "2075 ZFB", choferNombre: "MARVIN RAMOS", combustibleLitros: 170 },
  { correlativo: "22/10", fecha: "2026-10-02", f101: "218982", municipioCodigo: "51015", nivel: "La Moza", placa: "1529 HKX", choferNombre: "FELIX VASQUEZ", combustibleLitros: 170 },
  { correlativo: "23/10", fecha: "2026-10-02", f101: "218983", municipioCodigo: "51015", nivel: "La Moza", placa: "697 NPF", choferNombre: "EDWIN SANDI", combustibleLitros: 170 },
  { correlativo: "24/10", fecha: "2026-10-02", f101: "218984", municipioCodigo: "51015", nivel: "La Moza", placa: "598 ULI", choferNombre: "WALTER CHOQUE", combustibleLitros: 170 },
  { correlativo: "25/10", fecha: "2026-10-02", f101: "218985", municipioCodigo: "51015", nivel: "La Moza", placa: "1447 TKH", choferNombre: "VICENTE SAAVEDRA", combustibleLitros: 170 },
  { correlativo: "26/10", fecha: "2026-10-02", f101: "218986", municipioCodigo: "51015", nivel: "La Moza", placa: "826 UUT", choferNombre: "FELIPE ROJAS", combustibleLitros: 170 },
];

const ANIO = 2026;
const DESCRIPCION_CONOCIMIENTO_DEFAULT = "Carga para Ingenio del sector Lipeña";

async function importar() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("No hay ningún usuario ADMIN para atribuir esta importación.");

  const tipoMineral = await prisma.tipoMineral.findUnique({ where: { codigo: "C-CH" } });
  const ingenio = await prisma.ingenio.findUnique({ where: { codigo: "CH" } });
  if (!tipoMineral) throw new Error("No se encontró el tipo de mineral Carga Chami (C-CH).");
  if (!ingenio) throw new Error("No se encontró el ingenio Chilcobija (CH).");

  let creados = 0;
  let omitidos = 0;
  let maxNumero = 0;

  for (const fila of FILAS) {
    const numero = Number(fila.correlativo.split("/")[0]);
    if (numero > maxNumero) maxNumero = numero;

    const existente = await prisma.loteDespacho.findUnique({
      where: { correlativo_anio: { correlativo: fila.correlativo, anio: ANIO } },
    });
    if (existente) {
      console.warn(`Omitido ${fila.correlativo}/${ANIO}: ya existe (estado ${existente.estadoLote}).`);
      omitidos += 1;
      continue;
    }

    const [municipio, vehiculo, chofer] = await Promise.all([
      prisma.municipioOrigen.findUnique({ where: { codigo: fila.municipioCodigo } }),
      prisma.vehiculo.findUnique({ where: { placa: fila.placa } }),
      prisma.chofer.findFirst({ where: { nombre: fila.choferNombre } }),
    ]);
    if (!municipio) { console.error(`Omitido ${fila.correlativo}: municipio ${fila.municipioCodigo} no encontrado.`); continue; }
    if (!vehiculo) { console.error(`Omitido ${fila.correlativo}: vehículo ${fila.placa} no encontrado.`); continue; }
    if (!chofer) { console.error(`Omitido ${fila.correlativo}: chofer "${fila.choferNombre}" no encontrado.`); continue; }
    if (!vehiculo.propietarioId) { console.error(`Omitido ${fila.correlativo}: vehículo ${fila.placa} sin propietario asignado.`); continue; }

    const existenteF101 = await prisma.formulario101.findUnique({ where: { codigo: fila.f101 } });
    if (existenteF101) { console.error(`Omitido ${fila.correlativo}: F101 ${fila.f101} ya existe.`); continue; }

    const fechaDespachoReal = new Date(`${fila.fecha}T00:00:00.000Z`);

    await prisma.$transaction(async (tx) => {
      const lote = await tx.loteDespacho.create({
        data: {
          correlativo: fila.correlativo,
          anio: ANIO,
          municipioOrigenId: municipio.id,
          transportistaId: vehiculo.propietarioId as number,
          vehiculoId: vehiculo.id,
          choferId: chofer.id,
          tipoMineralId: tipoMineral.id,
          destinoIngenioId: ingenio.id,
          nivel: fila.nivel,
          incluyeCombustible: fila.combustibleLitros !== null ? "CON_COMBUSTIBLE" : "SIN_COMBUSTIBLE",
          combustibleAsignadoLitros: fila.combustibleLitros,
          fechaDespachoReal,
          fechaDocumentalFiscal: fechaDespachoReal,
          estadoLote: "EN_TRANSITO",
          usuarioRegistroId: admin.id,
          conocimientoCarga: {
            create: {
              fecha: fechaDespachoReal,
              detalleCarga: "Carga Chami",
              descripcion: DESCRIPCION_CONOCIMIENTO_DEFAULT,
              copiasEmitidas: { ingenio: true, chofer: true, empresa: true },
            },
          },
        },
      });

      await tx.formulario101.create({
        data: {
          codigo: fila.f101,
          fecha: fechaDespachoReal,
          estado: "VINCULADO",
          loteId: lote.id,
          usuarioId: admin.id,
        },
      });

      await tx.log.create({
        data: {
          usuarioId: admin.id,
          accion: "IMPORT_LOTE_HISTORICO",
          data: { loteId: lote.id, correlativo: fila.correlativo, f101: fila.f101 },
        },
      });
    });

    creados += 1;
    console.log(`Creado ${fila.correlativo} (${fila.placa} · ${fila.choferNombre}) — F101 ${fila.f101}.`);
  }

  // Sincroniza el contador mensual para que el próximo lote creado desde la
  // interfaz arranque justo después del último número usado por esta
  // importación (nunca hacia atrás, por si ya se creó algo más reciente).
  const clave = `LOTE_DESPACHO_${ANIO}_10`;
  const contador = await prisma.correlativoContador.findUnique({ where: { clave } });
  const nuevoUltimoNumero = Math.max(contador?.ultimoNumero ?? 0, maxNumero);
  await prisma.correlativoContador.upsert({
    where: { clave },
    create: { clave, ultimoNumero: nuevoUltimoNumero },
    update: { ultimoNumero: nuevoUltimoNumero },
  });

  console.log(`Importación completada: ${creados} lote(s) creado(s), ${omitidos} ya existían. Contador ${clave} = ${nuevoUltimoNumero}.`);
}

importar()
  .catch((error) => console.error("Error en la importación:", error))
  .finally(() => prisma.$disconnect());
