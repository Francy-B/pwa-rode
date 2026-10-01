import { pool } from '../db.js';

// Todo el SQL de las tablas `ingrediente` y `movimiento_stock` vive aquí. Ningún
// otro módulo del proyecto ejecuta consultas contra estas dos tablas: si algo
// necesita este dato, se lo pide a logica_negocio/inventario/inventario.servicio.js.

export async function listar({ q, estado }, conexion = pool) {
  const condiciones = [];
  const valores = [];
  if (q) {
    condiciones.push('nombre LIKE ?');
    valores.push(`%${q.replace(/[\\%_]/g, '\\$&')}%`);
  }
  if (estado === 'critico') condiciones.push('stock <= umbral_critico');
  if (estado === 'ok') condiciones.push('stock > umbral_critico');
  const [filas] = await conexion.query(
    `SELECT id_ingrediente, nombre, unidad_medida, stock, umbral_critico FROM ingrediente
     ${condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : ''}
     ORDER BY (stock <= umbral_critico) DESC, nombre`,
    valores
  );
  return filas;
}

export async function obtenerPorId(id, conexion = pool) {
  const [[fila]] = await conexion.query(
    'SELECT id_ingrediente, nombre, unidad_medida, stock, umbral_critico FROM ingrediente WHERE id_ingrediente = ?',
    [id]
  );
  return fila ?? null;
}

// Varios a la vez, sin bloqueo: para validar una receta o calcular disponibilidad.
export async function obtenerVariosPorId(ids, conexion = pool) {
  if (ids.length === 0) return [];
  const [filas] = await conexion.query(
    `SELECT id_ingrediente, nombre, unidad_medida, stock FROM ingrediente WHERE id_ingrediente IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  return filas;
}

// Igual, pero con FOR UPDATE: bloquea las filas mientras se decide un descuento.
export async function obtenerVariosPorIdBloqueando(ids, conexion) {
  if (ids.length === 0) return [];
  const [filas] = await conexion.query(
    `SELECT id_ingrediente, nombre, unidad_medida, stock FROM ingrediente WHERE id_ingrediente IN (${ids.map(() => '?').join(',')}) FOR UPDATE`,
    ids
  );
  return filas;
}

export async function todos(conexion = pool) {
  const [filas] = await conexion.query(
    'SELECT id_ingrediente, nombre, unidad_medida, stock, umbral_critico FROM ingrediente'
  );
  return filas;
}

// Se crea siempre con stock 0: el stock inicial se aplica aparte, con
// aplicarMovimiento (más abajo), para que ESA sea la única función que lo cambia.
export async function crear({ nombre, unidad, umbralBase }, conexion) {
  const [r] = await conexion.query(
    'INSERT INTO ingrediente (nombre, unidad_medida, stock, umbral_critico) VALUES (?, ?, 0, ?)',
    [nombre, unidad, umbralBase]
  );
  return r.insertId;
}

// No toca `stock`: el cambio de stock (la diferencia con el valor anterior) se
// aplica aparte, con aplicarMovimiento, para que ESA sea la única función que lo cambia.
export async function actualizar(id, { nombre, unidad, umbralBase }, conexion) {
  await conexion.query(
    'UPDATE ingrediente SET nombre = ?, unidad_medida = ?, umbral_critico = ? WHERE id_ingrediente = ?',
    [nombre, unidad, umbralBase, id]
  );
}

export async function eliminar(id, conexion) {
  await conexion.query('DELETE FROM movimiento_stock WHERE id_ingrediente = ?', [id]);
  await conexion.query('DELETE FROM ingrediente WHERE id_ingrediente = ?', [id]);
}

// Único punto de todo el backend que cambia `stock` o escribe en `movimiento_stock`.
// cantidadConSigno: negativa para descuento, positiva para compra/ajuste/reversión.
export async function aplicarMovimiento(conexion, idIngrediente, cantidadConSigno, tipo, idEncargo = null) {
  await conexion.query('UPDATE ingrediente SET stock = stock + ? WHERE id_ingrediente = ?', [
    cantidadConSigno,
    idIngrediente,
  ]);
  await conexion.query(
    'INSERT INTO movimiento_stock (id_ingrediente, id_encargo, tipo, cantidad) VALUES (?, ?, ?, ?)',
    [idIngrediente, idEncargo, tipo, cantidadConSigno]
  );
}

// Descuentos de un encargo aún no revertidos (ver RF-14 en encargos.servicio.js).
// Por id_movimiento y no por fecha: creado_en solo tiene precisión de segundo.
export async function descuentosSinRevertir(conexion, idEncargo) {
  const [movimientos] = await conexion.query(
    `SELECT id_ingrediente, cantidad FROM movimiento_stock
     WHERE id_encargo = ? AND tipo = 'descuento'
       AND id_movimiento > COALESCE(
         (SELECT MAX(id_movimiento) FROM movimiento_stock WHERE id_encargo = ? AND tipo = 'reversion'),
         0
       )
     FOR UPDATE`,
    [idEncargo, idEncargo]
  );
  return movimientos;
}
