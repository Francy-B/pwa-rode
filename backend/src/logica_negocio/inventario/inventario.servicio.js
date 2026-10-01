// Módulo "Gestión de inventario" (RF-03 a RF-06, Figura X). Concentra las reglas
// de ingredientes y stock. Los demás módulos nunca tocan `ingrediente` ni
// `movimiento_stock` directamente: pasan por las funciones de más abajo.
import { conTransaccion, pool } from '../../db.js';
import { ErrorHttp } from '../../errores.js';
import { aBase, desdeBase, esUnidad, mismaFamilia } from '../../unidades.js';
import * as inventarioRepo from '../../persistencia/inventario.repositorio.js';
import * as recetasServicio from '../recetas/recetas.servicio.js';

// ---------- Reglas internas ----------

// Fila de la base (unidad base) -> lo que ve la usuaria (unidad de compra).
function aApi(f) {
  const stock = Number(f.stock);
  const umbral = Number(f.umbral_critico);
  return {
    id: f.id_ingrediente,
    nombre: f.nombre,
    unidad_medida: f.unidad_medida,
    stock: desdeBase(stock, f.unidad_medida),
    umbral_critico: desdeBase(umbral, f.unidad_medida),
    critico: stock <= umbral, // RF-18
  };
}

// Acepta 2.5 o "2,5"; rechaza vacíos, letras y negativos.
function numero(valor, etiqueta) {
  const n = typeof valor === 'number' ? valor : Number(String(valor ?? '').trim().replace(',', '.'));
  if (valor === '' || valor == null || !Number.isFinite(n) || n < 0 || n > 999999) {
    throw new ErrorHttp(400, `${etiqueta} debe ser un número mayor o igual a 0`);
  }
  return n;
}

// Valida el cuerpo y lo pasa a unidad base. La usuaria escribe "2" y "kg"; se guarda 2000.
function leerCuerpo(b = {}) {
  const nombre = String(b.nombre ?? '').trim();
  if (!nombre) throw new ErrorHttp(400, 'El nombre es obligatorio');
  if (nombre.length > 120) throw new ErrorHttp(400, 'El nombre es demasiado largo');
  if (!esUnidad(b.unidad_medida)) throw new ErrorHttp(400, 'La unidad de medida no es válida');
  const unidad = b.unidad_medida;
  return {
    nombre,
    unidad,
    stockBase: aBase(numero(b.stock, 'La cantidad disponible'), unidad),
    umbralBase: aBase(numero(b.umbral_critico, 'El stock mínimo'), unidad),
  };
}

const duplicado = (err) =>
  err.code === 'ER_DUP_ENTRY' ? new ErrorHttp(409, 'Ya existe un ingrediente con ese nombre') : err;

async function obtenerOFallar(id, conexion) {
  const fila = await inventarioRepo.obtenerPorId(id, conexion);
  if (!fila) throw new ErrorHttp(404, 'Ingrediente no encontrado');
  return fila;
}

// ---------- RF-04: consultar ----------
export async function listar({ q, estado = 'todos' } = {}) {
  if (!['todos', 'critico', 'ok'].includes(estado)) {
    throw new ErrorHttp(400, 'El filtro de estado no es válido');
  }
  const filas = await inventarioRepo.listar({ q, estado });
  return filas.map(aApi);
}

export async function obtener(id) {
  return aApi(await obtenerOFallar(id));
}

// ---------- RF-03: crear ----------
export async function crear(datos) {
  const d = leerCuerpo(datos);
  const id = await conTransaccion(async (c) => {
    let idIngrediente;
    try {
      idIngrediente = await inventarioRepo.crear(d, c);
    } catch (err) {
      throw duplicado(err);
    }
    // El stock inicial queda anotado como ajuste (inventario de partida).
    if (d.stockBase > 0) {
      await inventarioRepo.aplicarMovimiento(c, idIngrediente, d.stockBase, 'ajuste');
    }
    return idIngrediente;
  });
  return obtener(id);
}

// ---------- RF-05: editar y actualizar stock ----------
export async function actualizar(id, datos) {
  const d = leerCuerpo(datos);
  await conTransaccion(async (c) => {
    // FOR UPDATE: bloquea la fila mientras se calcula la diferencia de stock.
    const [actual] = await inventarioRepo.obtenerVariosPorIdBloqueando([id], c);
    if (!actual) throw new ErrorHttp(404, 'Ingrediente no encontrado');

    // No se cambia entre peso/volumen/unidades: rompería las recetas y el historial.
    if (!mismaFamilia(actual.unidad_medida, d.unidad)) {
      throw new ErrorHttp(
        409,
        'No se puede cambiar el tipo de unidad de un ingrediente (peso, volumen o unidades). Crea uno nuevo.'
      );
    }
    try {
      await inventarioRepo.actualizar(id, d, c);
    } catch (err) {
      throw duplicado(err);
    }
    // Se anota la diferencia: si sube es una compra; si baja, un ajuste.
    const diferencia = Math.round((d.stockBase - Number(actual.stock)) * 1000) / 1000;
    if (diferencia !== 0) {
      await inventarioRepo.aplicarMovimiento(c, id, diferencia, diferencia > 0 ? 'compra' : 'ajuste');
    }
  });
  return obtener(id);
}

// ---------- RF-06: eliminar (bloqueado si está en una receta) ----------
export async function eliminar(id) {
  await conTransaccion(async (c) => {
    await obtenerOFallar(id, c);

    // "En uso" es información del dominio Recetas (tabla producto_ingrediente):
    // se pide a través de su interfaz, nunca se consulta esa tabla desde aquí.
    const recetas = await recetasServicio.productosQueUsanIngrediente(id, c);
    if (recetas.length) {
      throw new ErrorHttp(409, 'No se puede eliminar: el ingrediente se usa en recetas', { recetas });
    }
    await recetasServicio.limpiarLineasHuerfanas(id, c);
    await inventarioRepo.eliminar(id, c);
  });
}

// ---------- Interfaz para los otros módulos (Recetas, Encargos, Alertas) ----------
// Nunca se exponen las tablas tal cual: siempre pasan por estas funciones.

// Para validar una receta (Recetas): nombre y unidad de compra de varios ingredientes.
export async function obtenerVarios(ids, conexion = pool) {
  return inventarioRepo.obtenerVariosPorId(ids, conexion);
}

// Para descontar (Encargos, RF-15): bloquea las filas y las trae, en la misma transacción.
export async function bloquearYObtenerVarios(ids, conexion) {
  return inventarioRepo.obtenerVariosPorIdBloqueando(ids, conexion);
}

// Único punto de todo el backend que cambia el stock o escribe en el historial de
// movimientos; lo usa Encargos para descontar y revertir (RF-14, RF-15).
export async function aplicarMovimiento(conexion, idIngrediente, cantidadConSigno, tipo, idEncargo) {
  await inventarioRepo.aplicarMovimiento(conexion, idIngrediente, cantidadConSigno, tipo, idEncargo);
}

export async function descuentosSinRevertir(conexion, idEncargo) {
  return inventarioRepo.descuentosSinRevertir(conexion, idEncargo);
}

// Para la lista de compras (Alertas, RF-17/RF-18): todos los ingredientes con su stock y mínimo.
export async function todos(conexion = pool) {
  return inventarioRepo.todos(conexion);
}
