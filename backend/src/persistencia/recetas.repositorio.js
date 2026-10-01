import { pool } from '../db.js';

// Todo el SQL de las tablas `producto` y `producto_ingrediente` vive aquí.

export async function listar({ q }, conexion = pool) {
  const condiciones = ['activo = 1'];
  const valores = [];
  if (q) {
    condiciones.push('nombre LIKE ?');
    valores.push(`%${q.replace(/[\\%_]/g, '\\$&')}%`);
  }
  const [filas] = await conexion.query(
    `SELECT id_producto, nombre, cantidad_base FROM producto WHERE ${condiciones.join(' AND ')} ORDER BY nombre`,
    valores
  );
  return filas;
}

export async function obtenerPorId(id, conexion = pool) {
  const [[p]] = await conexion.query(
    'SELECT id_producto, nombre, cantidad_base, activo FROM producto WHERE id_producto = ?',
    [id]
  );
  return p ?? null;
}

// Solo para bloquear la fila mientras se reemplaza la receta (RF-09).
export async function obtenerPorIdBloqueando(id, conexion) {
  const [[p]] = await conexion.query('SELECT id_producto FROM producto WHERE id_producto = ? FOR UPDATE', [id]);
  return p ?? null;
}

export async function obtenerLineas(idProducto, conexion = pool) {
  const [lineas] = await conexion.query(
    `SELECT pi.id_ingrediente, i.nombre, i.unidad_medida AS unidad_ingrediente, pi.cantidad_necesaria, pi.unidad
     FROM producto_ingrediente pi JOIN ingrediente i ON i.id_ingrediente = pi.id_ingrediente
     WHERE pi.id_producto = ? ORDER BY i.nombre`,
    [idProducto]
  );
  return lineas;
}

// Solo lo necesario para escalar la receta a una cantidad pedida (lo usan Encargos
// y Alertas): sin nombre ni unidad de compra, eso se pide a Inventario.
export async function obtenerLineasCrudas(idProducto, conexion = pool) {
  const [lineas] = await conexion.query(
    'SELECT id_ingrediente, cantidad_necesaria FROM producto_ingrediente WHERE id_producto = ?',
    [idProducto]
  );
  return lineas;
}

// Para saber, antes de crear, si ese nombre ya lo tiene un producto eliminado (que
// se podría reactivar en vez de chocar con el nombre único). FOR UPDATE: evita que
// dos creaciones con el mismo nombre lo reactiven a la vez.
export async function obtenerPorNombreBloqueando(nombre, conexion) {
  const [[p]] = await conexion.query('SELECT id_producto, activo FROM producto WHERE nombre = ? FOR UPDATE', [
    nombre,
  ]);
  return p ?? null;
}

export async function reactivar(id, { cantidadBase }, conexion) {
  await conexion.query('UPDATE producto SET activo = 1, cantidad_base = ? WHERE id_producto = ?', [
    cantidadBase,
    id,
  ]);
}

export async function crear({ nombre, cantidadBase }, conexion) {
  const [r] = await conexion.query('INSERT INTO producto (nombre, cantidad_base) VALUES (?, ?)', [
    nombre,
    cantidadBase,
  ]);
  return r.insertId;
}

export async function actualizar(id, { nombre, cantidadBase }, conexion) {
  await conexion.query('UPDATE producto SET nombre = ?, cantidad_base = ? WHERE id_producto = ?', [
    nombre,
    cantidadBase,
    id,
  ]);
}

export async function reemplazarLineas(idProducto, lineas, conexion) {
  await conexion.query('DELETE FROM producto_ingrediente WHERE id_producto = ?', [idProducto]);
  for (const l of lineas) {
    await conexion.query(
      'INSERT INTO producto_ingrediente (id_producto, id_ingrediente, cantidad_necesaria, unidad) VALUES (?, ?, ?, ?)',
      [idProducto, l.idIngrediente, l.cantidadBase, l.unidad]
    );
  }
}

export async function desactivar(id, conexion = pool) {
  const [r] = await conexion.query('UPDATE producto SET activo = 0 WHERE id_producto = ? AND activo = 1', [id]);
  return r.affectedRows > 0;
}

export async function existe(id, conexion = pool) {
  const [[fila]] = await conexion.query('SELECT 1 AS x FROM producto WHERE id_producto = ?', [id]);
  return Boolean(fila);
}

// RF-06: productos activos que usan un ingrediente (para que Inventario bloquee su eliminación).
export async function nombresQueUsanIngrediente(idIngrediente, conexion) {
  const [filas] = await conexion.query(
    `SELECT p.nombre FROM producto_ingrediente pi
     JOIN producto p ON p.id_producto = pi.id_producto
     WHERE pi.id_ingrediente = ? AND p.activo = 1 ORDER BY p.nombre`,
    [idIngrediente]
  );
  return filas.map((f) => f.nombre);
}

// Al eliminar un ingrediente sin usos activos, limpia líneas residuales de
// productos ya "eliminados" (activo = 0) que aún lo mencionaran.
export async function borrarLineasDeIngredienteInactivo(idIngrediente, conexion) {
  await conexion.query(
    `DELETE pi FROM producto_ingrediente pi
     JOIN producto p ON p.id_producto = pi.id_producto
     WHERE pi.id_ingrediente = ? AND p.activo = 0`,
    [idIngrediente]
  );
}
