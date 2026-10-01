import { pool } from '../db.js';

// Todo el SQL de las tablas `usuario` y `sesion` vive aquí.

export async function obtenerPorCorreo(correo, conexion = pool) {
  const [[fila]] = await conexion.query('SELECT id_usuario, correo, password_hash FROM usuario WHERE correo = ?', [
    correo,
  ]);
  return fila ?? null;
}

export async function obtenerPorId(id, conexion = pool) {
  const [[fila]] = await conexion.query('SELECT correo, password_hash FROM usuario WHERE id_usuario = ?', [id]);
  return fila ?? null;
}

export async function actualizarPassword(id, hash, conexion = pool) {
  await conexion.query('UPDATE usuario SET password_hash = ? WHERE id_usuario = ?', [hash, id]);
}

export async function crearSesion(idSesion, idUsuario, conexion = pool) {
  await conexion.query('INSERT INTO sesion (id_sesion, id_usuario) VALUES (?, ?)', [idSesion, idUsuario]);
}

export async function borrarSesion(idSesion, conexion = pool) {
  await conexion.query('DELETE FROM sesion WHERE id_sesion = ?', [idSesion]);
}

export async function borrarOtrasSesiones(idUsuario, idSesionActual, conexion = pool) {
  await conexion.query('DELETE FROM sesion WHERE id_usuario = ? AND id_sesion != ?', [idUsuario, idSesionActual]);
}

// Confirma que la sesión sigue viva y le actualiza la fecha de último uso.
export async function renovarUso(idSesion, idUsuario, conexion = pool) {
  const [r] = await conexion.query(
    'UPDATE sesion SET ultimo_uso = UTC_TIMESTAMP() WHERE id_sesion = ? AND id_usuario = ?',
    [idSesion, idUsuario]
  );
  return r.affectedRows > 0;
}
