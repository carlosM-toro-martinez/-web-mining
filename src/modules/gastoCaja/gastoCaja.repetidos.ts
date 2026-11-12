// Detección de gastos "posiblemente repetidos". Es una ayuda para revisar, no
// una regla: nunca bloquea nada, solo marca lo que conviene mirar antes de
// cerrar el mes.
//
// Dos gastos (no anulados, misma moneda) se consideran posible repetido si:
//   A) tienen el mismo monto, un proveedor parecido y fechas a menos de 45
//      días, salvo que cada uno traiga un n° de factura/recibo distinto y
//      reconocible (dos facturas distintas del mismo hotel por el mismo
//      monto no son repetidas); o
//   B) comparten el mismo n° de factura/recibo real y un proveedor parecido,
//      aunque el monto cambie (suele ser un error al tipear).

export interface GastoParaRepetidos {
  id: string;
  fecha: Date;
  proveedorNombre: string;
  montoTotal: unknown;
  moneda: string;
  numeroRespaldo: string | null;
}

const VENTANA_DIAS = 45;
const PALABRAS_SIN_VALOR = new Set(["sa", "srl", "ltda", "por", "rendir", "varios", "pagos", "de", "la", "el", "y"]);

function normalizarProveedor(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((p) => p && !PALABRAS_SIN_VALOR.has(p))
    .join(" ");
}

function distancia(a: string, b: string, maximo: number) {
  if (Math.abs(a.length - b.length) > maximo) return maximo + 1;
  let previa = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const actual = [i];
    for (let j = 1; j <= b.length; j++) {
      actual[j] = Math.min(
        previa[j]! + 1,
        actual[j - 1]! + 1,
        previa[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previa = actual;
  }
  return previa[b.length]!;
}

function proveedoresParecidos(a: string, b: string) {
  if (!a || !b) return false;
  if (a === b) return true;
  const corto = a.length <= b.length ? a : b;
  const largo = a.length <= b.length ? b : a;
  if (corto.length >= 5 && largo.includes(corto)) return true;
  // Mismas palabras en otro orden ("PAREDES REYES RICARDO" / "RICARDO PAREDES REYES").
  const orden = (t: string) => t.split(" ").sort().join(" ");
  if (orden(a) === orden(b)) return true;
  // Un par de letras distintas ("JOGE TAPIA" / "JORGE TAPIA").
  return corto.length >= 6 && distancia(a, b, 2) <= 2;
}

// Solo cuenta como n° de respaldo si tiene algún dígito distinto de cero:
// "0", "DEPOSITO", "POR FACTURAR" o vacío no identifican a ningún documento.
function respaldoReal(numero: string | null) {
  if (!numero) return null;
  const digitos = numero.replace(/\D/g, "");
  if (!digitos || /^0+$/.test(digitos)) return null;
  return digitos.replace(/^0+/, "");
}

function respaldosIguales(a: string, b: string) {
  if (a === b) return true;
  // Un solo dígito de diferencia en números largos suele ser un error al tipear.
  return a.length >= 4 && b.length >= 4 && distancia(a, b, 1) <= 1;
}

export function idsPosiblesRepetidos(gastos: GastoParaRepetidos[]) {
  const datos = gastos.map((g) => ({
    id: g.id,
    dia: Math.floor(g.fecha.getTime() / 86_400_000),
    proveedor: normalizarProveedor(g.proveedorNombre),
    centavos: Math.round(Number(g.montoTotal) * 100),
    moneda: g.moneda,
    respaldo: respaldoReal(g.numeroRespaldo),
  }));

  const repetidos = new Set<string>();

  for (let i = 0; i < datos.length; i++) {
    const a = datos[i]!;
    for (let j = i + 1; j < datos.length; j++) {
      const b = datos[j]!;
      if (a.moneda !== b.moneda || !proveedoresParecidos(a.proveedor, b.proveedor)) continue;

      const mismoMonto = a.centavos === b.centavos;
      const cercanos = Math.abs(a.dia - b.dia) <= VENTANA_DIAS;
      const ambosConRespaldo = a.respaldo !== null && b.respaldo !== null;
      const mismoRespaldo = ambosConRespaldo && respaldosIguales(a.respaldo!, b.respaldo!);

      const reglaA = mismoMonto && cercanos && (!ambosConRespaldo || mismoRespaldo);
      const reglaB = mismoRespaldo;
      if (reglaA || reglaB) {
        repetidos.add(a.id);
        repetidos.add(b.id);
      }
    }
  }

  return repetidos;
}
