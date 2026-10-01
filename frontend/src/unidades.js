// Unidades que ve la usuaria. Deben coincidir con las del backend (backend/src/unidades.js).
export const UNIDADES = [
  { valor: 'gr', nombre: 'Gramos', corto: 'g' },
  { valor: 'kg', nombre: 'Kilos', corto: 'kg' },
  { valor: 'ml', nombre: 'Mililitros', corto: 'ml' },
  { valor: 'l', nombre: 'Litros', corto: 'L' },
  { valor: 'und', nombre: 'Unidades', corto: 'und' },
]

const FACTOR = { gr: 1, kg: 1000, ml: 1, l: 1000, und: 1 }
const FAMILIA = { gr: 'masa', kg: 'masa', ml: 'volumen', l: 'volumen', und: 'conteo' }

// Cuánto suman o restan los botones − y + de cada unidad.
export const PASO = { gr: 50, ml: 50, kg: 0.5, l: 0.5, und: 1 }

export const familiaDe = (u) => FAMILIA[u]
export const corto = (u) => UNIDADES.find((x) => x.valor === u)?.corto ?? u

export const formatear = (n) => Number(n).toLocaleString('es-CO', { maximumFractionDigits: 3 })

export const textoCantidad = (n, u) =>
  u === 'und' ? `${formatear(n)} ${Number(n) === 1 ? 'unidad' : 'unidades'}` : `${formatear(n)} ${corto(u)}`

// Pasa una cantidad de una unidad a otra de la misma familia (2 kg -> 2000 gr).
export function convertir(n, de, a) {
  return Math.round(((n * FACTOR[de]) / FACTOR[a]) * 1000) / 1000
}
