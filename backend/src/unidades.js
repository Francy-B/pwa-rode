// Conversión de unidades. El stock se guarda SIEMPRE en unidad base (gr, ml, und);
// la usuaria ve y captura la unidad en que compra el ingrediente (kg, l, ...).
//
// Familias: masa (gr, kg), volumen (ml, l) y conteo (und). Solo se convierte dentro
// de la misma familia: gr <-> ml requeriría la densidad de cada ingrediente.

const UNIDADES = {
  gr: { familia: 'masa', factor: 1 },
  kg: { familia: 'masa', factor: 1000 },
  ml: { familia: 'volumen', factor: 1 },
  l: { familia: 'volumen', factor: 1000 },
  und: { familia: 'conteo', factor: 1 },
};

const BASE = { masa: 'gr', volumen: 'ml', conteo: 'und' };

export class ErrorUnidad extends Error {}

export const esUnidad = (u) => Object.hasOwn(UNIDADES, u);

function info(unidad) {
  if (!esUnidad(unidad)) throw new ErrorUnidad(`Unidad no válida: ${unidad}`);
  return UNIDADES[unidad];
}

export const familiaDe = (unidad) => info(unidad).familia;
export const unidadBase = (unidad) => BASE[info(unidad).familia];
export const mismaFamilia = (a, b) => info(a).familia === info(b).familia;

// La base de datos guarda 3 decimales (DECIMAL(12,3)); se redondea igual aquí para
// que lo calculado coincida con lo guardado y no queden restos como 0.30000000000000004.
const redondear = (n) => Math.round(n * 1000) / 1000;

// 2 kg -> 2000 (gr)
export function aBase(cantidad, unidad) {
  return redondear(cantidad * info(unidad).factor);
}

// 2000 (gr) -> 2 en kg
export function desdeBase(cantidadBase, unidad) {
  return redondear(cantidadBase / info(unidad).factor);
}

// 250 gr -> 0.25 kg. Falla si las unidades son de familias distintas.
export function convertir(cantidad, deUnidad, aUnidad) {
  if (!mismaFamilia(deUnidad, aUnidad)) {
    throw new ErrorUnidad(`No se puede convertir ${deUnidad} a ${aUnidad}`);
  }
  return desdeBase(aBase(cantidad, deUnidad), aUnidad);
}
