import { pool } from '../db.js';

// Todo el SQL de la tabla `encargo` vive aquí.

const SELECT_BASE = `
  SELECT e.id_encargo, e.nombre_cliente, e.id_producto, p.nombre AS producto_nombre,
         e.cantidad_pedida, e.fecha_entrega, e.estado
  FROM encargo e JOIN producto p ON p.id_producto = e.id_producto`;

export async function listar({ estado }, conexion = pool) {
  const condiciones = [];
  const valores = [];
  if (estado && estado !== 'todos') {
    condiciones.push('e.estado = ?');
    valores.push(estado);
  }
  const [filas] = await conexion.query(
    `${SELECT_BASE} ${condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : ''}
     ORDER BY e.fecha_entrega, e.id_encargo`,
    valores
  );
  return filas;
}

export async function obtenerPorId(id, conexion = pool) {
  const [[fila]] = await conexion.query(`${SELECT_BASE} WHERE e.id_encargo = ?`, [id]);
  return fila ?? null;
}

// Para la lista de compras (Alertas, RF-17): solo lo mínimo para escalar recetas.
export async function obtenerPendientes(conexion = pool) {
  const [filas] = await conexion.query("SELECT id_producto, cantidad_pedida FROM encargo WHERE estado = 'pendiente'");
  return filas;
}

// RF-10: encargos de este producto que todavía no llegaron a un estado final
// (ni entregados ni eliminados). Mientras exista alguno, Recetas no debe dejar
// eliminar el producto.
export async function activosDeProducto(idProducto, conexion = pool) {
  const [filas] = await conexion.query(
    "SELECT nombre_cliente FROM encargo WHERE id_producto = ? AND estado IN ('pendiente','preparando') ORDER BY fecha_entrega",
    [idProducto]
  );
  return filas.map((f) => f.nombre_cliente);
}

export async function crear({ nombreCliente, idProducto, cantidadPedida, fechaEntrega }, conexion) {
  const [r] = await conexion.query(
    'INSERT INTO encargo (nombre_cliente, id_producto, cantidad_pedida, fecha_entrega) VALUES (?, ?, ?, ?)',
    [nombreCliente, idProducto, cantidadPedida, fechaEntrega]
  );
  return r.insertId;
}

// FOR UPDATE: bloquea el encargo mientras se decide el cambio de estado.
export async function obtenerParaCambiarEstado(id, conexion) {
  const [[enc]] = await conexion.query(
    'SELECT id_producto, cantidad_pedida, estado FROM encargo WHERE id_encargo = ? FOR UPDATE',
    [id]
  );
  return enc ?? null;
}

export async function cambiarEstado(id, estado, conexion) {
  await conexion.query('UPDATE encargo SET estado = ? WHERE id_encargo = ?', [estado, id]);
}

export async function eliminarSiPendiente(id, conexion = pool) {
  const [r] = await conexion.query("DELETE FROM encargo WHERE id_encargo = ? AND estado = 'pendiente'", [id]);
  return r.affectedRows > 0;
}

export async function obtenerEstado(id, conexion = pool) {
  const [[fila]] = await conexion.query('SELECT estado FROM encargo WHERE id_encargo = ?', [id]);
  return fila?.estado ?? null;
}
